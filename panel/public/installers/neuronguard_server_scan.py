#!/usr/bin/env python3
"""
NeuronGuard — INST-01 Server Security Scanner
Recoge datos de configuración del servidor Linux y los envía al agente server-scan.
Instalar en el servidor objetivo con: python3 neuronguard_server_scan.py
"""
import json
import subprocess
import sys
import os
import requests

# ── Config ────────────────────────────────────────────────────────────────────
NEURONGUARD_URL  = os.getenv("NEURONGUARD_URL", "https://api-agents.shyntai.com")
NEURONGUARD_KEY  = os.getenv("NEURONGUARD_API_KEY", "")
SESSION_ID       = os.getenv("SESSION_ID", "local-scan-001")
CLIENT_ID        = os.getenv("CLIENT_ID", "")
# ──────────────────────────────────────────────────────────────────────────────


def run(cmd: str) -> str:
    try:
        result = subprocess.run(
            cmd, shell=True, capture_output=True, text=True, timeout=15
        )
        return result.stdout.strip()
    except Exception as e:
        return f"ERROR: {e}"


def collect() -> dict:
    print("[*] Recogiendo datos del servidor…")
    data: dict = {}

    # Open ports
    data["open_ports"] = run("ss -tlnp 2>/dev/null || netstat -tlnp 2>/dev/null")

    # Running services
    data["running_services"] = run(
        "systemctl list-units --state=running --type=service --no-pager 2>/dev/null | head -50"
    )

    # Sudo users
    data["sudo_users"] = run("getent group sudo wheel 2>/dev/null")

    # SSH config (no passwords, no keys)
    data["ssh_config"] = run(
        "grep -vE '^\\s*#|^\\s*$' /etc/ssh/sshd_config 2>/dev/null | "
        "grep -vE 'AuthorizedKeysFile|HostKey|TrustedUserCAKeys'"
    )

    # Critical file permissions
    data["critical_perms"] = run(
        "stat -c '%a %U %G %n' /etc/passwd /etc/shadow /etc/sudoers "
        "/etc/ssh/sshd_config /etc/crontab 2>/dev/null"
    )

    # Upgradable packages (names only, no versions to reduce payload)
    data["upgradable_packages"] = run(
        "apt list --upgradable 2>/dev/null | grep -v 'Listing' | head -30 || "
        "yum check-update 2>/dev/null | grep -v 'Last metadata' | head -30"
    )

    # Users with login shell
    data["login_users"] = run(
        "getent passwd | awk -F: '$7 !~ /nologin|false/ {print $1,$3,$7}'"
    )

    # World-writable files in common dirs (limited)
    data["world_writable"] = run(
        "find /etc /usr /var -maxdepth 3 -type f -perm -o+w 2>/dev/null | head -20"
    )

    # Firewall status
    data["firewall"] = run(
        "ufw status 2>/dev/null || firewall-cmd --state 2>/dev/null || "
        "iptables -L INPUT -n --line-numbers 2>/dev/null | head -20"
    )

    # Cron jobs
    data["crontabs"] = run("crontab -l 2>/dev/null; ls -la /etc/cron* 2>/dev/null")

    # OS info
    data["os_info"] = run("cat /etc/os-release 2>/dev/null; uname -r")

    # Last logins
    data["last_logins"] = run("last -n 20 2>/dev/null")

    return data


def send(data: dict) -> dict:
    headers = {
        "Content-Type": "application/json",
        "x-api-key": NEURONGUARD_KEY,
    }
    payload = {
        "session_id": SESSION_ID,
        "client_id":  CLIENT_ID,
        "message":    f"Analiza la seguridad de este servidor Linux. Datos recogidos:\n\n{json.dumps(data, ensure_ascii=False, indent=2)}",
    }
    print("[*] Enviando datos a NeuronGuard…")
    resp = requests.post(
        f"{NEURONGUARD_URL}/agent/server-scan",
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
    print("NEURONGUARD — SERVER SECURITY REPORT")
    print("=" * 70)
    print(result.get("response", "Sin respuesta"))
    print("=" * 70)
    print(f"Modelo: {result.get('model_used', '-')} | Tokens: {result.get('tokens_used', '-')}")


if __name__ == "__main__":
    main()
