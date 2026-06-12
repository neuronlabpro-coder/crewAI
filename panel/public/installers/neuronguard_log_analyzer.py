#!/usr/bin/env python3
"""
NeuronGuard — INST-02 Log Analyzer
Recoge logs del servidor Linux y los envía al agente log-analysis para análisis de amenazas.
"""
import json
import subprocess
import sys
import os
import requests

NEURONGUARD_URL = os.getenv("NEURONGUARD_URL", "https://api-agents.shyntai.com")
NEURONGUARD_KEY = os.getenv("NEURONGUARD_API_KEY", "")
SESSION_ID      = os.getenv("SESSION_ID", "log-scan-001")
CLIENT_ID       = os.getenv("CLIENT_ID", "")
LOG_LINES       = int(os.getenv("LOG_LINES", "500"))


def run(cmd: str) -> str:
    try:
        result = subprocess.run(
            cmd, shell=True, capture_output=True, text=True, timeout=15
        )
        return result.stdout.strip()
    except Exception as e:
        return f"ERROR: {e}"


def tail_log(path: str, lines: int = LOG_LINES) -> str:
    return run(f"tail -n {lines} {path} 2>/dev/null")


def collect() -> dict:
    print("[*] Recogiendo logs del servidor…")
    data: dict = {}

    data["auth_log"]     = tail_log("/var/log/auth.log")
    data["syslog"]       = tail_log("/var/log/syslog", lines=200)
    data["nginx_access"] = tail_log("/var/log/nginx/access.log", lines=200)
    data["nginx_error"]  = tail_log("/var/log/nginx/error.log", lines=100)
    data["apache_error"] = tail_log("/var/log/apache2/error.log", lines=100)

    # Failed logins
    data["failed_logins"] = run("lastb -n 100 2>/dev/null")

    # Successful logins
    data["successful_logins"] = run("last -n 50 2>/dev/null")

    # Active sessions
    data["active_sessions"] = run("w 2>/dev/null")

    # Suspicious processes
    data["suspicious_processes"] = run(
        "ps aux --sort=-%cpu 2>/dev/null | head -20"
    )

    # Recent cron executions
    data["cron_recent"] = run(
        "grep -i 'cron\\|CRON' /var/log/syslog 2>/dev/null | tail -50 || "
        "grep -i 'cron' /var/log/messages 2>/dev/null | tail -50"
    )

    # Journal security events (last 2h)
    data["journal_security"] = run(
        "journalctl -p 3 --since '2 hours ago' --no-pager 2>/dev/null | tail -100"
    )

    return data


def send(data: dict) -> dict:
    headers = {
        "Content-Type": "application/json",
        "x-api-key": NEURONGUARD_KEY,
    }
    payload = {
        "session_id": SESSION_ID,
        "client_id":  CLIENT_ID,
        "message":    f"Analiza estos logs en busca de actividad maliciosa, intentos de intrusión y amenazas:\n\n{json.dumps(data, ensure_ascii=False, indent=2)}",
    }
    print("[*] Enviando logs a NeuronGuard…")
    resp = requests.post(
        f"{NEURONGUARD_URL}/agent/log-analysis",
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
    print("NEURONGUARD — LOG SECURITY ANALYSIS")
    print("=" * 70)
    print(result.get("response", "Sin respuesta"))
    print("=" * 70)
    print(f"Modelo: {result.get('model_used', '-')} | Tokens: {result.get('tokens_used', '-')}")


if __name__ == "__main__":
    main()
