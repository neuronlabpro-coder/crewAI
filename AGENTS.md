# NeuronGuard AG Agents — Coding Agent Instructions

This file contains instructions for AI coding agents (Codex, etc.) implementing the NeuronGuard AG Agents Platform.

## Project Overview
42 cybersecurity expert AI agents built with CrewAI + FastAPI. Each agent has its own RAG knowledge base (Qdrant), conversation memory (Redis), and specialized skills (MCP Skills Server).

## Tech Stack
- Python 3.11+
- CrewAI (Crews + Flows)
- FastAPI + Uvicorn
- Qdrant (vector search, dim 1024)
- Redis (conversation history)
- Docker + docker-compose

## Key Architecture Rules

### Agent Pattern (8 attributes only)
Every agent file in `agents/` must follow this exact pattern:
```python
from core.agent_base import NeuronGuardAgent

class AgentClassName(NeuronGuardAgent):
    slug: str = "agent-slug"
    name: str = "Agent Display Name"
    role: str = "Agent Role for CrewAI"
    goal: str = "What this agent aims to achieve"
    backstory: str = """Complete system prompt here..."""
    qdrant_collection: str = "ag_agent_slug"
    llm_model: str = "deepseek-ai/DeepSeek-V4-Pro"
    max_tokens: int = 2048
    temperature: float = 0.1
    mcp_domains: list[str] = ["domain1", "domain2"]
```

### Core Files (DO NOT MODIFY without instruction)
- `core/agent_base.py` — base class, handles all infrastructure
- `core/config.py` — environment variables
- `api/routes.py` — FastAPI routing
- `flows/agent_flow.py` — CrewAI Flow orchestration

### Adding a New Agent
1. Create `agents/{slug_with_underscores}.py`
2. Define class inheriting `NeuronGuardAgent`
3. Add to `agents/__init__.py` registry
4. No other changes needed

## Implementation Order
Implement in this exact order, running tests between phases:

**Phase 1: Core Infrastructure**
```
core/config.py
core/tools/redis_memory.py
core/tools/qdrant_tool.py
core/tools/mcp_tool.py
core/agent_base.py
api/routes.py
flows/agent_flow.py
agents/__init__.py
```

**Phase 2: First Agent (Validation)**
```
agents/vuln_analysis.py
Dockerfile
docker-compose.yaml
requirements.txt
.env.example
```

**Phase 3: All Other Agents**
```
agents/pentest_web.py
agents/pentest_network.py
... (all 42 agents from NEURONGUARD_AGENTS_SPEC.md)
```

## Environment Variables
See `.env.example` for all required variables. Never hardcode credentials.

## Testing
After each phase, run:
```bash
# Health check
curl http://localhost:8000/health

# Agent test
curl -X POST http://localhost:8000/agent/vuln-analysis \
  -H "Content-Type: application/json" \
  -d '{"session_id":"test-001","client_id":"test","message":"What is CVE-2024-1234?"}'
```

## Linting & Type Checking
Before marking any task complete:
```bash
ruff check .
mypy .
pytest tests/ -v
```

## Agent Specifications
Full agent specifications (prompts, models, skills) are in `NEURONGUARD_AGENTS_SPEC.md`.
Implement agents EXACTLY as specified — do not modify system prompts without instruction.

## DeepSeek Response Cleaning
DeepSeek-V4-Pro returns `<think>...</think>` blocks. Always strip them:
```python
import re
text = re.sub(r'<think>.*?</think>', '', raw_response, flags=re.DOTALL).strip()
```

## Error Handling
- Always return proper HTTP status codes
- Log all errors with structlog
- Never expose internal errors to clients
- Return consistent error format: `{"error": "message", "code": "ERROR_CODE"}`
