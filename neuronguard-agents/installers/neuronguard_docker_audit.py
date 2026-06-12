#!/usr/bin/env python3
"""
NeuronGuard — INST-04 Docker Security Auditor
Recoge el estado de seguridad de los contenedores Docker y los envía al agente container-audit.
Las variables de entorno con posibles secretos se REDACTAN — solo se envía el nombre de la variable.
"""
import json
import subprocess
import sys
import os
import re
import requests

NEURONGUARD_URL = os.getenv("NEURONGUARD_URL", "https://api-agents.shyntai.com")
NEURONGUARD_KEY = os.getenv("NEURONGUARD_API_KEY", "")
SESSION_ID      = os.getenv("SESSION_ID", "docker-audit-001")
CLIENT_ID       = os.getenv("CLIENT_ID", "")

# Env var names that look like secrets — value will be redacted
SECRET_VAR_PATTERNS = re.compile(
    r"(?i)(key|secret|password|passwd|token|credential|auth|api_key|private)"
)


def run(cmd: str) -> str:
    try:
        result = subprocess.run(cmd, shell=True, capture_output=True, text=True, timeout=30)
        return result.stdout.strip()
    except Exception as e:
        return f"ERROR: {e}"


def run_json(cmd: str) -> list | dict:
    try:
        result = subprocess.run(cmd, shell=True, capture_output=True, text=True, timeout=30)
        return json.loads(result.stdout)
    except Exception:
        return []


def redact_env(env_list: list[str]) -> list[str]:
    """Replace secret values with [REDACTED], keep var names."""
    redacted = []
    for entry in env_list:
        if "=" in entry:
            key, _ = entry.split("=", 1)
            if SECRET_VAR_PATTERNS.search(key):
                redacted.append(f"{key}=[REDACTED]")
            else:
                redacted.append(entry)
        else:
            redacted.append(entry)
    return redacted


def collect() -> dict:
    print("[*] Recogiendo estado Docker…")
    data: dict = {}

    # Running containers
    containers_raw = run_json("docker ps --format '{{json .}}' 2>/dev/null | jq -s '.'")
    if isinstance(containers_raw, list):
        data["running_containers"] = len(containers_raw)
        data["container_list"]     = containers_raw
    else:
        data["container_summary"] = run("docker ps 2>/dev/null")

    # Inspect each container (security-relevant fields only)
    container_ids = run("docker ps -q 2>/dev/null").splitlines()
    inspections = []
    for cid in container_ids[:20]:  # cap at 20
        raw = run_json(f"docker inspect {cid} 2>/dev/null")
        if isinstance(raw, list) and raw:
            c = raw[0]
            inspection = {
                "Id":         cid[:12],
                "Name":       c.get("Name", ""),
                "Image":      c.get("Config", {}).get("Image", ""),
                "User":       c.get("Config", {}).get("User", "root"),
                "Privileged": c.get("HostConfig", {}).get("Privileged", False),
                "CapAdd":     c.get("HostConfig", {}).get("CapAdd") or [],
                "NetworkMode":c.get("HostConfig", {}).get("NetworkMode", ""),
                "Ports":      c.get("NetworkSettings", {}).get("Ports", {}),
                "Mounts":     [{"Source": m.get("Source"), "Destination": m.get("Destination"), "Mode": m.get("Mode")} for m in c.get("Mounts", [])],
                "Env":        redact_env(c.get("Config", {}).get("Env") or []),
                "Memory":     c.get("HostConfig", {}).get("Memory", 0),
                "CpuQuota":   c.get("HostConfig", {}).get("CpuQuota", 0),
            }
            inspections.append(inspection)
    data["container_inspections"] = inspections

    # Images
    data["images"] = run("docker images --format 'table {{.Repository}}\\t{{.Tag}}\\t{{.CreatedSince}}\\t{{.Size}}' 2>/dev/null")

    # Networks
    data["networks"] = run("docker network ls 2>/dev/null")

    # Docker-compose files found
    compose_files = run("find / -maxdepth 5 -name 'docker-compose*.yml' -o -name 'docker-compose*.yaml' 2>/dev/null | head -10")
    data["compose_files_found"] = compose_files.splitlines()

    # Read docker-compose content if found (with env var redaction)
    compose_contents = {}
    for cf in data["compose_files_found"][:3]:
        try:
            content = open(cf).read()
            # Redact obvious secrets in compose files
            content = re.sub(
                r"(?i)(password|secret|token|key|passwd):\s*\S+",
                lambda m: m.group(0).split(":")[0] + ": [REDACTED]",
                content,
            )
            compose_contents[cf] = content[:3000]  # cap
        except Exception:
            pass
    data["compose_contents"] = compose_contents

    # Docker daemon config
    data["daemon_config"] = run("cat /etc/docker/daemon.json 2>/dev/null")

    # Docker info
    data["docker_info"] = run("docker info --format '{{json .}}' 2>/dev/null | python3 -m json.tool 2>/dev/null | head -30")

    return data


def send(data: dict) -> dict:
    headers = {
        "Content-Type": "application/json",
        "x-api-key": NEURONGUARD_KEY,
    }
    payload = {
        "session_id": SESSION_ID,
        "client_id":  CLIENT_ID,
        "message":    f"Audita la seguridad de este entorno Docker. Datos recogidos del servidor:\n\n{json.dumps(data, ensure_ascii=False, indent=2)}",
    }
    print("[*] Enviando snapshot Docker a NeuronGuard…")
    resp = requests.post(
        f"{NEURONGUARD_URL}/agent/container-audit",
        json=payload,
        headers=headers,
        timeout=120,
    )
    resp.raise_for_status()
    return resp.json()


def main() -> None:
    if not NEURONGUARD_KEY:
        print("[!] Configura NEURONGUARD_API_KEY como variable de entorno")
        sys.exit(1)

    # Check docker available
    if "not found" in run("which docker") or not run("docker ps 2>/dev/null"):
        print("[!] Docker no disponible o sin permisos. Ejecuta como root o con sudo.")
        sys.exit(1)

    data   = collect()
    result = send(data)

    print("\n" + "=" * 70)
    print("NEURONGUARD — DOCKER SECURITY AUDIT REPORT")
    print("=" * 70)
    print(result.get("response", "Sin respuesta"))
    print("=" * 70)
    print(f"Contenedores analizados: {data.get('running_containers', '?')}")
    print(f"Modelo: {result.get('model_used', '-')} | Tokens: {result.get('tokens_used', '-')}")


if __name__ == "__main__":
    main()
