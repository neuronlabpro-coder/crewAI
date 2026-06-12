#!/usr/bin/env python3
"""
NeuronGuard — INST-05 Red Team Agent
Script de red team ofensivo/defensivo basado en el framework Raptor.
REQUIERE autorización explícita antes de ejecutar cualquier prueba.
Solo úsalo en sistemas que tengas autorización explícita para testear.
"""
import json
import subprocess
import sys
import os
import socket
import requests

NEURONGUARD_URL = os.getenv("NEURONGUARD_URL", "https://api-agents.shyntai.com")
NEURONGUARD_KEY = os.getenv("NEURONGUARD_API_KEY", "")
SESSION_ID      = os.getenv("SESSION_ID", "redteam-001")
CLIENT_ID       = os.getenv("CLIENT_ID", "")


def banner() -> None:
    print("""
╔══════════════════════════════════════════════════════════════════╗
║          NEURONGUARD — RED TEAM AGENT (INST-05)                 ║
║          Inspirado en el framework Raptor                       ║
╚══════════════════════════════════════════════════════════════════╝
""")


def request_authorization(target: str) -> bool:
    print("""
⚠️  AUTORIZACIÓN REQUERIDA
══════════════════════════════════════════════════════════
Este script realiza pruebas de seguridad ACTIVAS sobre:
  Target: {target}

Solo úsalo en sistemas que tengas autorización EXPLÍCITA y
DOCUMENTADA para testear. El uso no autorizado es ILEGAL.

Al confirmar declaras que:
  ✓ Tienes autorización escrita del propietario del sistema
  ✓ Estás actuando dentro del alcance definido
  ✓ Has notificado al equipo IT correspondiente
══════════════════════════════════════════════════════════
""".format(target=target))

    confirm = input('¿Confirmas que tienes autorización? (escribir exactamente "AUTORIZO"): ')
    return confirm.strip() == "AUTORIZO"


def run(cmd: str, timeout: int = 30) -> str:
    try:
        result = subprocess.run(
            cmd, shell=True, capture_output=True, text=True, timeout=timeout
        )
        return result.stdout.strip() + (f"\nSTDERR: {result.stderr.strip()}" if result.stderr.strip() else "")
    except subprocess.TimeoutExpired:
        return "TIMEOUT"
    except Exception as e:
        return f"ERROR: {e}"


def resolve_target(target: str) -> dict:
    """Basic DNS resolution."""
    info: dict = {"target": target}
    try:
        info["ip"] = socket.gethostbyname(target)
        info["fqdn"] = socket.getfqdn(target)
    except Exception:
        info["ip"] = target
    return info


def passive_recon(target: str) -> dict:
    """Passive reconnaissance — no active connections to target."""
    print("[*] Fase 1: Reconocimiento pasivo…")
    return {
        "whois":      run(f"whois {target} 2>/dev/null | head -40"),
        "dns_a":      run(f"dig +short A {target} 2>/dev/null"),
        "dns_mx":     run(f"dig +short MX {target} 2>/dev/null"),
        "dns_ns":     run(f"dig +short NS {target} 2>/dev/null"),
        "dns_txt":    run(f"dig +short TXT {target} 2>/dev/null"),
        "dns_all":    run(f"dig +short ANY {target} 2>/dev/null"),
        "subdomains": run(f"subfinder -d {target} -silent 2>/dev/null | head -30 || "
                          f"amass enum -passive -d {target} 2>/dev/null | head -30 || "
                          f"echo 'subfinder/amass no disponible'"),
    }


def active_scan(target: str) -> dict:
    """Active port scan with nmap."""
    print("[*] Fase 2: Escaneo activo de puertos y servicios…")
    return {
        "nmap_top1000": run(
            f"nmap -sV -sC --top-ports 1000 -T4 -oN - {target} 2>/dev/null", timeout=120
        ),
        "nmap_udp_top20": run(
            f"nmap -sU --top-ports 20 -T3 {target} 2>/dev/null", timeout=60
        ),
    }


def web_recon(target: str) -> dict:
    """Basic web reconnaissance."""
    print("[*] Fase 3: Reconocimiento web…")
    results: dict = {}

    # HTTP headers
    results["http_headers"] = run(f"curl -sI --max-time 10 http://{target} 2>/dev/null | head -30")
    results["https_headers"] = run(f"curl -sI --max-time 10 https://{target} 2>/dev/null | head -30")

    # SSL/TLS info
    results["ssl_info"] = run(
        f"echo | openssl s_client -connect {target}:443 -brief 2>/dev/null | head -20 || "
        f"nmap --script ssl-cert -p 443 {target} 2>/dev/null | head -30"
    )

    # Basic nikto (if available)
    results["nikto"] = run(
        f"nikto -h {target} -maxtime 60 -nointeractive 2>/dev/null | head -50 || "
        f"echo 'nikto no disponible'"
    )

    # Technology fingerprint
    results["whatweb"] = run(
        f"whatweb -a 1 {target} 2>/dev/null || echo 'whatweb no disponible'"
    )

    return results


def credential_check(target: str, ports: str = "") -> dict:
    """Check for default credentials on common services."""
    print("[*] Fase 4: Verificación de credenciales por defecto…")
    results: dict = {}

    # SSH default check (timing-safe — just checks banner)
    results["ssh_banner"] = run(
        f"nc -w 3 {target} 22 </dev/null 2>/dev/null | head -5 || echo 'SSH no accesible'"
    )

    # FTP anonymous
    results["ftp_anon"] = run(
        f"curl -s --max-time 10 ftp://{target}/ 2>/dev/null | head -10 || echo 'FTP no accesible'"
    )

    # Web admin panels (just check existence, no auth attempt)
    common_paths = ["/admin", "/wp-admin", "/phpmyadmin", "/manager", "/console", "/.env", "/config.php"]
    http_findings = []
    for path in common_paths:
        code = run(f"curl -s -o /dev/null -w '%{{http_code}}' --max-time 5 http://{target}{path} 2>/dev/null")
        if code and code not in ("000", "404", ""):
            http_findings.append(f"HTTP {code}: {path}")
    results["exposed_paths"] = http_findings

    return results


def collect(target: str) -> dict:
    target_info = resolve_target(target)
    return {
        "target_info":   target_info,
        "passive_recon": passive_recon(target),
        "active_scan":   active_scan(target),
        "web_recon":     web_recon(target),
        "credential_check": credential_check(target),
        "methodology":   "PTES",
        "scope":         "authorized",
    }


def send(target: str, data: dict) -> dict:
    headers = {
        "Content-Type": "application/json",
        "x-api-key": NEURONGUARD_KEY,
    }
    payload = {
        "session_id": SESSION_ID,
        "client_id":  CLIENT_ID,
        "message":    (
            f"Analiza los resultados de este ejercicio de red team sobre el target autorizado '{target}'.\n"
            f"Identifica vectores de ataque, evalúa el impacto y genera un reporte técnico y ejecutivo.\n\n"
            f"Datos recogidos:\n{json.dumps(data, ensure_ascii=False, indent=2)}"
        ),
    }
    print("[*] Enviando resultados a NeuronGuard para análisis…")
    resp = requests.post(
        f"{NEURONGUARD_URL}/agent/red-team",
        json=payload,
        headers=headers,
        timeout=180,
    )
    resp.raise_for_status()
    return resp.json()


def main() -> None:
    banner()

    if not NEURONGUARD_KEY:
        print("[!] Configura NEURONGUARD_API_KEY como variable de entorno")
        sys.exit(1)

    if len(sys.argv) < 2:
        print("Uso: python3 neuronguard_redteam.py <target>")
        print("Ejemplo: python3 neuronguard_redteam.py ejemplo.com")
        sys.exit(1)

    target = sys.argv[1].strip()

    if not request_authorization(target):
        print("[!] Autorización no confirmada. Abortando.")
        sys.exit(0)

    print(f"\n[+] Autorización confirmada. Iniciando red team sobre: {target}\n")

    data   = collect(target)
    result = send(target, data)

    print("\n" + "=" * 70)
    print("NEURONGUARD — RED TEAM REPORT")
    print("=" * 70)
    print(result.get("response", "Sin respuesta"))
    print("=" * 70)
    print(f"Target: {target}")
    print(f"Modelo: {result.get('model_used', '-')} | Tokens: {result.get('tokens_used', '-')}")


if __name__ == "__main__":
    main()
