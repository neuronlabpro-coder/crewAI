"""Genera el SQL de INSERT para la tabla ag_agents sin necesitar crewAI."""
import ast, os, re, sys, io
from datetime import datetime, timezone

# Forzar UTF-8 en stdout (Windows usa cp1252 por defecto)
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding="utf-8")

AGENTS_DIR = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "agents")
WEBHOOK_BASE = "https://api-agents.shyntai.com/agent"
NOW = datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")

MODEL_DEEP     = "moonshotai/Kimi-K2.6"
MODEL_STANDARD = "moonshotai/Kimi-K2.6"
MODEL_TEACHER  = "moonshotai/Kimi-K2.6"
MODEL_PROD     = "anthropic/claude-fable-5"


def esc(s):
    """Escapa una cadena para SQL (comillas simples)."""
    return s.replace("'", "''")


def parse_agent(path: str) -> dict | None:
    try:
        src = open(path, encoding="utf-8").read()
        tree = ast.parse(src)
    except Exception:
        return None

    for node in ast.walk(tree):
        if not isinstance(node, ast.ClassDef):
            continue
        attrs = {}
        for item in node.body:
            if not isinstance(item, ast.Assign):
                continue
            for t in item.targets:
                if not isinstance(t, ast.Name):
                    continue
                k = t.id
                v = item.value
                if isinstance(v, ast.Constant):
                    attrs[k] = v.value
                elif isinstance(v, (ast.JoinedStr, ast.BinOp)):
                    # f-string o concat — evaluar de forma segura
                    try:
                        attrs[k] = ast.literal_eval(v)
                    except Exception:
                        attrs[k] = ""
                elif isinstance(v, ast.List):
                    attrs[k] = [
                        elt.value for elt in v.elts if isinstance(elt, ast.Constant)
                    ]
                elif isinstance(v, ast.Attribute):
                    # settings.FEATHERLESS_MODEL_DEEP → usar valor por defecto
                    attr_name = v.attr
                    if "DEEP" in attr_name:
                        attrs[k] = MODEL_DEEP
                    elif "STANDARD" in attr_name:
                        attrs[k] = MODEL_STANDARD
                    elif "TEACHER" in attr_name:
                        attrs[k] = MODEL_TEACHER
                    else:
                        attrs[k] = MODEL_STANDARD

        slug = attrs.get("slug")
        if not slug:
            continue

        # Concatenar backstory si está dividida en partes
        backstory = attrs.get("backstory", "")
        if not backstory:
            # Buscar concatenaciones en el fuente
            m = re.search(r'backstory\s*=\s*\((.*?)\)', src, re.DOTALL)
            if m:
                raw = m.group(1).strip()
                parts = re.findall(r'"((?:[^"\\]|\\.)*?)"|\'((?:[^\'\\]|\\.)*?)\'', raw)
                backstory = "".join(a or b for a, b in parts).replace("\\n", "\n")

        agent_type = "teacher" if "teach" in slug else "expert"
        mcp_domains = attrs.get("mcp_domains", [])
        import json
        domains_jsonb = json.dumps(mcp_domains)

        return {
            "slug": slug,
            "name": attrs.get("name", slug),
            "role": attrs.get("role", ""),
            "goal": attrs.get("goal", ""),
            "backstory": backstory,
            "llm_model": attrs.get("llm_model", MODEL_STANDARD),
            "llm_model_prod": MODEL_PROD,
            "max_tokens": int(attrs.get("max_tokens", 2048)),
            "temperature": float(attrs.get("temperature", 0.1)),
            "mcp_domains": domains_jsonb,
            "agent_type": agent_type,
            "active": True,
            "webhook_url": f"{WEBHOOK_BASE}/{slug}",
        }
    return None


def main():
    agents = []
    for fname in sorted(os.listdir(AGENTS_DIR)):
        if not fname.endswith(".py") or fname.startswith("_"):
            continue
        data = parse_agent(os.path.join(AGENTS_DIR, fname))
        if data:
            agents.append(data)

    print(f"-- NeuronGuard ag_agents seed — {len(agents)} agentes — {NOW}")
    print("-- Solo INSERTs. Ejecutar en InsForge > SQL Editor DESPUÉS de aplicar la migración.")
    print("-- Migración: migrations/20260612000000_create-ag-agents.sql\n")

    for a in agents:
        print(f"""INSERT INTO ag_agents (slug, name, webhook_path, role, goal, backstory, llm_model, llm_model_prod, max_tokens, temperature, mcp_domains, agent_type, active, webhook_url)
VALUES (
  '{esc(a["slug"])}',
  '{esc(a["name"])}',
  '/agent/{esc(a["slug"])}',
  '{esc(a["role"])}',
  '{esc(a["goal"])}',
  '{esc(a["backstory"])}',
  '{esc(a["llm_model"])}',
  '{esc(a["llm_model_prod"])}',
  {a["max_tokens"]},
  {a["temperature"]},
  '{esc(a["mcp_domains"])}'::jsonb,
  '{a["agent_type"]}',
  {str(a["active"]).upper()},
  '{esc(a["webhook_url"])}'
);
""")

    print(f"-- Total: {len(agents)} agentes insertados/actualizados.")


if __name__ == "__main__":
    main()
