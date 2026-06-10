# NeuronGuard AG Agents — Claude Code Instructions

## Proyecto
NeuronGuard AG Agents Platform — 42 agentes expertos en ciberseguridad construidos con CrewAI + FastAPI, desplegados en Docker via Dokploy.

## Stack
- **Framework:** CrewAI (Crews + Flows) + FastAPI
- **LLM Dev:** Featherless.ai (ver sección de modelos)
- **LLM Prod:** OpenRouter (claude-fable-5 / gpt-5.5)
- **Embeddings:** Qwen/Qwen3-Embedding-0.6B via Featherless
- **Vector DB:** Qdrant en `vectordatarag.neuronguard.site` (dim 1024)
- **Memoria:** Redis (historial por sesión)
- **Skills:** MCP Skills Server `mcp-skills.shyntai.com` (754 skills)
- **DB:** InsForge/PostgREST `neurona-aplication-backend.shyntai.com`
- **Deploy:** Docker + Dokploy

## Estructura del proyecto
```
neuronguard-agents/
├── core/
│   ├── __init__.py
│   ├── agent_base.py        # Clase base — NUNCA MODIFICAR sin consenso
│   ├── config.py            # Variables de entorno
│   └── tools/
│       ├── __init__.py
│       ├── qdrant_tool.py   # RAG por colección
│       ├── mcp_tool.py      # 754 skills filtrados por dominio
│       └── redis_memory.py  # Historial de conversación
├── agents/
│   ├── __init__.py          # Auto-registro de todos los agentes
│   ├── vuln_analysis.py     # AG-01
│   ├── pentest_web.py       # AG-02
│   └── ... (42 archivos total)
├── api/
│   ├── __init__.py
│   └── routes.py            # FastAPI endpoints
├── flows/
│   ├── __init__.py
│   └── agent_flow.py        # CrewAI Flow principal
├── Dockerfile
├── docker-compose.yaml
├── requirements.txt
└── .env.example
```

## Reglas de implementación CRÍTICAS

### 1. agent_base.py — Clase base
Cada agente HEREDA de `NeuronGuardAgent`. Solo define estos atributos:
```python
class MyAgent(NeuronGuardAgent):
    slug = "mi-agente"
    name = "Nombre del Agente"
    role = "Rol en CrewAI"
    goal = "Objetivo del agente"
    backstory = "System prompt completo..."
    qdrant_collection = "ag_mi_agente"
    llm_model = "deepseek-ai/DeepSeek-V4-Pro"  # modelo Featherless
    max_tokens = 2048
    temperature = 0.1
    mcp_domains = ["domain1", "domain2"]  # filtros para MCP Skills
```

### 2. Modelos disponibles (Featherless — 4 slots cada uno)
Solo uno activo a la vez. Recomendación por tipo:
- **Análisis profundo** → `deepseek-ai/DeepSeek-V4-Pro`
- **Razonamiento complejo** → `moonshotai/Kimi-K2-Thinking`
- **Consulta estándar** → `moonshotai/Kimi-K2.6` o `zai-org/GLM-5.1`
- **Embeddings (siempre activo)** → `Qwen/Qwen3-Embedding-0.6B`

Config via `.env`:
```
FEATHERLESS_MODEL_DEEP=deepseek-ai/DeepSeek-V4-Pro
FEATHERLESS_MODEL_STANDARD=moonshotai/Kimi-K2.6
```

### 3. FastAPI endpoint unificado
```
POST /agent/{slug}
Body: { session_id, client_id, message, context? }
Response: { session_id, agent, response, sources, tokens_used, model_used }
```

### 4. Redis — historial de conversación
- Key: `ag:{slug}:history:{session_id}`
- TTL: 86400 (24h)
- Max entradas: 20
- Formato: lista JSON de `{role, content, timestamp}`

### 5. Qdrant — búsqueda RAG
- Colección: `ag_{slug}` (ya creadas, dim 1024)
- Top K: 5 resultados
- Score mínimo: 0.7
- API Key: `process.env.QDRANT_API_KEY`

### 6. MCP Skills — filtrado por dominio
- Endpoint: `GET https://mcp-skills.shyntai.com/skills?domains={domains}&limit=15`
- Filtrar por `mcp_domains` del agente
- Máximo 15 skills por llamada

### 7. InsForge — registro de sesiones y logs
- Base URL: `https://neurona-aplication-backend.shyntai.com`
- Tablas: `ag_sessions`, `ag_usage_logs`, `ag_agents`
- Usar HTTP Request con PostgREST syntax (NO usar cliente InsForge nativo — tiene bugs con filtros)
- Ejemplo: `GET /ag_agents?slug=eq.vuln-analysis`

### 8. DeepSeek — limpieza de tokens `<think>`
DeepSeek-V4-Pro devuelve bloques `<think>...</think>` en la respuesta.
SIEMPRE limpiarlos antes de retornar al cliente:
```python
import re
def clean_deepseek_response(text: str) -> str:
    return re.sub(r'<think>.*?</think>', '', text, flags=re.DOTALL).strip()
```
### 9. Embeddings — procesamiento secuencial obligatorio (Featherless slot budget)
NUNCA procesar embeddings en paralelo. Featherless tiene slot limitado.
El ingestor debe procesar chunks UNO A UNO con pausa entre cada uno:

```python
import asyncio

async def embed_chunks_sequential(chunks: list[str], client) -> list[list[float]]:
    """
    Procesa embeddings de forma secuencial — 1 chunk por request.
    NUNCA usar asyncio.gather() ni threading para embeddings.
    """
    embeddings = []
    for i, chunk in enumerate(chunks):
        embedding = await client.embeddings.create(
            model=settings.FEATHERLESS_EMBEDDING_MODEL,  # Qwen/Qwen3-Embedding-0.6B
            input=[chunk],  # siempre lista de 1 elemento
        )
        embeddings.append(embedding.data[0].embedding)
        # Pausa entre chunks para no saturar el slot
        if i < len(chunks) - 1:
            await asyncio.sleep(0.5)
    return embeddings
```

Variables de entorno que controlan esto:
- `FEATHERLESS_EMBEDDING_BATCH_SIZE=1`
- `FEATHERLESS_EMBEDDING_MAX_CONCURRENT=1`
- `QDRANT_EMBED_BATCH_SIZE=1`

El cliente de embeddings DEBE inicializarse con:
```python
from openai import AsyncOpenAI

embeddings_client = AsyncOpenAI(
    api_key=settings.FEATHERLESS_API_KEY,
    base_url=settings.FEATHERLESS_BASE_URL,
    max_retries=3,
    timeout=30.0,
)
```

## Orden de implementación

### Fase 1 — Core (implementar primero)
1. `core/config.py` — todas las variables de entorno
2. `core/tools/redis_memory.py` — historial de conversación
3. `core/tools/qdrant_tool.py` — RAG tool
4. `core/tools/mcp_tool.py` — skills tool
5. `core/agent_base.py` — clase base completa
6. `api/routes.py` — endpoint FastAPI
7. `flows/agent_flow.py` — CrewAI Flow
8. `agents/__init__.py` — auto-registro

### Fase 2 — Primer agente de validación
9. `agents/vuln_analysis.py` — AG-01 (test end-to-end)
10. Dockerfile + docker-compose.yaml
11. Test: `POST /agent/vuln-analysis`

### Fase 3 — Resto de agentes (solo después de validar AG-01)
12-51. Implementar los 41 agentes restantes siguiendo el patrón

## Variables de entorno requeridas
```
# Featherless
FEATHERLESS_API_KEY=...
FEATHERLESS_BASE_URL=https://api.featherless.ai/v1

# OpenRouter (producción)
OPENROUTER_API_KEY=...
OPENROUTER_BASE_URL=https://openrouter.ai/api/v1

# Qdrant
QDRANT_URL=https://vectordatarag.neuronguard.site
QDRANT_API_KEY=3lpw1xrylsoelgbu9wvgr7polxgtv1cu

# Redis
REDIS_URL=redis://...
REDIS_PASSWORD=...

# InsForge
INSFORGE_URL=https://neurona-aplication-backend.shyntai.com
INSFORGE_API_KEY=...

# MCP Skills
MCP_SKILLS_URL=https://mcp-skills.shyntai.com
MCP_SKILLS_API_KEY=...

# App
ENV=development  # development | production
PORT=8000
```

## Checklist por agente
Antes de marcar un agente como completado:
- [ ] Archivo `agents/{slug}.py` creado
- [ ] Hereda correctamente de `NeuronGuardAgent`
- [ ] Todos los atributos definidos (slug, name, role, goal, backstory, qdrant_collection, llm_model, max_tokens, temperature, mcp_domains)
- [ ] Registrado en `agents/__init__.py`
- [ ] Test básico: `curl -X POST /agent/{slug} -d '{"session_id":"test","message":"hola"}'`
- [ ] Respuesta coherente con el rol del agente

## Convenciones de código
- Python 3.11+
- Type hints en todas las funciones
- Docstrings en clases y métodos públicos
- No hardcodear credentials (usar `.env`)
- Logging estructurado con `structlog`
- Manejo de errores con respuestas HTTP apropiadas (400, 500, etc.)

## Referencia de agentes
Ver `NEURONGUARD_AGENTS_SPEC.md` para:
- System prompts completos de cada agente
- Skills MCP por agente
- Modelos y parámetros
- Colecciones Qdrant
