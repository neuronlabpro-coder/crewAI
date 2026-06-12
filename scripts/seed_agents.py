"""
Registra los 42 agentes NeuronGuard en la tabla ag_agents de InsForge.
Uso: python scripts/seed_agents.py
"""

import sys
import os
import pkgutil
import importlib
import inspect
import httpx
from datetime import datetime, timezone

# Añadir el root del proyecto al path
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from dotenv import load_dotenv
load_dotenv()

from core.agent_base import NeuronGuardAgent
from core.config import settings

INSFORGE_URL = os.environ.get("INSFORGE_URL", "").rstrip("/")
INSFORGE_API_KEY = os.environ.get("INSFORGE_API_KEY", "")
AGENTS_API_URL = os.environ.get("AGENTS_API_URL", "https://api-agents.shyntai.com")

if not INSFORGE_URL or not INSFORGE_API_KEY:
    print("ERROR: INSFORGE_URL y/o INSFORGE_API_KEY no están definidas en .env")
    sys.exit(1)

DB_URL = f"{INSFORGE_URL}/api/database/records"
HEADERS = {
    "Content-Type": "application/json",
    "Authorization": f"Bearer {INSFORGE_API_KEY}",
    "Prefer": "return=representation",
}


def discover_agents() -> list[type]:
    """Descubre todas las clases que heredan de NeuronGuardAgent."""
    import agents as agents_pkg
    classes = []
    for _, module_name, _ in pkgutil.iter_modules(agents_pkg.__path__):
        mod = importlib.import_module(f"agents.{module_name}")
        for _, obj in inspect.getmembers(mod, inspect.isclass):
            if (
                issubclass(obj, NeuronGuardAgent)
                and obj is not NeuronGuardAgent
                and hasattr(obj, "slug")
                and obj.slug
            ):
                classes.append(obj)
    return classes


def agent_to_payload(cls: type) -> dict:
    return {
        "slug": cls.slug,
        "name": cls.name,
        "role": cls.role,
        "goal": cls.goal,
        "backstory": cls.backstory,
        "llm_model": cls.llm_model if not callable(cls.llm_model) else str(cls.llm_model),
        "llm_model_prod": getattr(cls, "llm_model_prod", "anthropic/claude-fable-5"),
        "max_tokens": cls.max_tokens,
        "temperature": cls.temperature,
        "qdrant_collection": cls.qdrant_collection,
        "mcp_domains": cls.mcp_domains,
        "agent_type": "teacher" if "teach" in cls.slug else "expert",
        "active": True,
        "webhook_url": f"{AGENTS_API_URL}/agent/{cls.slug}",
        "created_at": datetime.now(timezone.utc).isoformat(),
        "updated_at": datetime.now(timezone.utc).isoformat(),
    }


def upsert_agent(client: httpx.Client, payload: dict) -> str:
    slug = payload["slug"]

    # Comprobar si ya existe
    r = client.get(f"{DB_URL}/ag_agents?slug=eq.{slug}&limit=1")
    exists = r.status_code == 200 and r.json()

    if exists:
        r = client.patch(
            f"{DB_URL}/ag_agents?slug=eq.{slug}",
            json={k: v for k, v in payload.items() if k not in ("slug", "created_at")},
        )
        action = "UPDATED"
    else:
        r = client.post(f"{DB_URL}/ag_agents", json=payload)
        action = "CREATED"

    if r.status_code not in (200, 201):
        return f"ERROR ({r.status_code}): {r.text[:120]}"

    return action


def main():
    print(f"InsForge: {INSFORGE_URL}")
    print(f"Descubriendo agentes...\n")

    agent_classes = discover_agents()
    print(f"Encontrados: {len(agent_classes)} agentes\n")

    ok = error = 0
    with httpx.Client(headers=HEADERS, timeout=20) as client:
        for cls in sorted(agent_classes, key=lambda c: c.slug):
            payload = agent_to_payload(cls)
            result = upsert_agent(client, payload)
            icon = "✓" if result in ("CREATED", "UPDATED") else "✗"
            print(f"  {icon} [{result}] {cls.slug}")
            if result in ("CREATED", "UPDATED"):
                ok += 1
            else:
                error += 1

    print(f"\n{'='*40}")
    print(f"OK: {ok} | ERROR: {error}")
    if error:
        print("Revisa los errores arriba y verifica que la tabla ag_agents existe en InsForge.")
    else:
        print("Todos los agentes registrados correctamente.")


if __name__ == "__main__":
    main()
