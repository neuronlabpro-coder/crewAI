#!/usr/bin/env python3
"""
NeuronGuard — INST-03 Secret Leak Detector
Detecta patrones de secretos expuestos. NUNCA envía valores reales — solo metadata y patrones.
"""
import json
import re
import sys
import os
import subprocess
import requests
from pathlib import Path

NEURONGUARD_URL = os.getenv("NEURONGUARD_URL", "https://api-agents.shyntai.com")
NEURONGUARD_KEY = os.getenv("NEURONGUARD_API_KEY", "")
SESSION_ID      = os.getenv("SESSION_ID", "secret-scan-001")
CLIENT_ID       = os.getenv("CLIENT_ID", "")

# Patterns: (type_name, regex) — we only record TYPE and FILE, never the value
SECRET_PATTERNS: list[tuple[str, re.Pattern]] = [
    ("AWS Access Key",       re.compile(r"AKIA[0-9A-Z]{16}")),
    ("AWS Secret Key",       re.compile(r"(?i)aws.{0,10}secret.{0,10}['\"][0-9a-zA-Z/+=]{40}")),
    ("Generic API Key",      re.compile(r"(?i)(api_key|apikey|api-key)\s*[=:]\s*['\"]?[0-9a-zA-Z\-_]{20,}")),
    ("Generic Token",        re.compile(r"(?i)(token|secret|password|passwd|pwd)\s*[=:]\s*['\"]?[0-9a-zA-Z\-_@#$!]{8,}")),
    ("Private Key Header",   re.compile(r"-----BEGIN (RSA |EC |DSA |OPENSSH )?PRIVATE KEY-----")),
    ("JWT Token",            re.compile(r"eyJ[A-Za-z0-9\-_]+\.eyJ[A-Za-z0-9\-_]+\.[A-Za-z0-9\-_]+")),
    ("Database URL",         re.compile(r"(?i)(mysql|postgresql|mongodb|redis)://[^@\s]+@[^\s]+")),
    ("Slack Token",          re.compile(r"xox[baprs]-[0-9a-zA-Z\-]+")),
    ("GitHub Token",         re.compile(r"gh[oprsu]_[A-Za-z0-9_]{36}")),
    ("Google API Key",       re.compile(r"AIza[0-9A-Za-z\-_]{35}")),
    ("Stripe Key",           re.compile(r"(?:r|s)k_(?:live|test)_[0-9a-zA-Z]{24}")),
    ("Sendgrid Key",         re.compile(r"SG\.[a-zA-Z0-9\-_]{22}\.[a-zA-Z0-9\-_]{43}")),
    ("OpenAI Key",           re.compile(r"sk-[a-zA-Z0-9]{48}")),
]

# Directories to scan
SCAN_DIRS = [
    "/etc", "/var/www", "/opt", "/home", "/root",
    "/app", "/srv", "/usr/local",
]
SCAN_EXTENSIONS = {".env", ".conf", ".cfg", ".yml", ".yaml", ".json", ".ini", ".toml", ".properties", ".xml"}
MAX_FILE_SIZE   = 1024 * 512  # 512 KB


def scan_file(path: Path) -> list[dict]:
    findings = []
    try:
        if path.stat().st_size > MAX_FILE_SIZE:
            return []
        content = path.read_text(errors="ignore")
        for line_no, line in enumerate(content.splitlines(), 1):
            for secret_type, pattern in SECRET_PATTERNS:
                if pattern.search(line):
                    findings.append({
                        "type":    secret_type,
                        "file":    str(path),
                        "line":    line_no,
                        "context": f"Line {line_no}: [VALUE REDACTED — pattern matched: {secret_type}]",
                    })
                    break  # one match per line is enough
    except (PermissionError, OSError):
        pass
    return findings


def scan_env_vars() -> list[dict]:
    findings = []
    try:
        env_output = subprocess.run(
            "env", shell=True, capture_output=True, text=True, timeout=5
        ).stdout
        for line in env_output.splitlines():
            for secret_type, pattern in SECRET_PATTERNS:
                if "=" in line:
                    key = line.split("=")[0]
                    value = line.split("=", 1)[1] if "=" in line else ""
                    if pattern.search(value):
                        findings.append({
                            "type":    secret_type,
                            "file":    "ENV_VARIABLE",
                            "line":    0,
                            "context": f"Variable: {key}=[VALUE REDACTED]",
                        })
                        break
    except Exception:
        pass
    return findings


def collect() -> dict:
    print("[*] Escaneando en busca de secretos expuestos…")
    print("[!] IMPORTANTE: Solo se envía metadata — NUNCA valores reales")

    all_findings: list[dict] = []

    for scan_dir in SCAN_DIRS:
        base = Path(scan_dir)
        if not base.exists():
            continue
        for path in base.rglob("*"):
            if path.is_file() and path.suffix.lower() in SCAN_EXTENSIONS:
                all_findings.extend(scan_file(path))

    all_findings.extend(scan_env_vars())

    # Check git history metadata (no content)
    git_findings: list[str] = []
    try:
        git_log = subprocess.run(
            "git log --all --oneline --diff-filter=A -- '*.env' '*.key' '*.pem' '*.p12' 2>/dev/null | head -10",
            shell=True, capture_output=True, text=True, timeout=10
        ).stdout
        if git_log.strip():
            git_findings.append(f"Git history contains potentially sensitive file commits:\n{git_log}")
    except Exception:
        pass

    return {
        "total_findings": len(all_findings),
        "findings":       all_findings[:100],  # cap at 100 findings
        "git_metadata":   git_findings,
        "scanned_dirs":   SCAN_DIRS,
        "note":           "Values are NEVER sent — only file paths, line numbers, and secret type patterns",
    }


def send(data: dict) -> dict:
    headers = {
        "Content-Type": "application/json",
        "x-api-key": NEURONGUARD_KEY,
    }
    payload = {
        "session_id": SESSION_ID,
        "client_id":  CLIENT_ID,
        "message":    f"Analiza estos hallazgos de detección de secretos expuestos y genera un plan de acción:\n\n{json.dumps(data, ensure_ascii=False, indent=2)}",
    }
    print(f"[*] Enviando {data['total_findings']} hallazgos a NeuronGuard (sin valores reales)…")
    resp = requests.post(
        f"{NEURONGUARD_URL}/agent/secret-scan",
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

    data   = collect()
    result = send(data)

    print("\n" + "=" * 70)
    print("NEURONGUARD — SECRET LEAK DETECTION REPORT")
    print("=" * 70)
    print(result.get("response", "Sin respuesta"))
    print("=" * 70)
    print(f"Hallazgos detectados: {data['total_findings']}")
    print(f"Modelo: {result.get('model_used', '-')} | Tokens: {result.get('tokens_used', '-')}")


if __name__ == "__main__":
    main()
