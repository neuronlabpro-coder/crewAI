# INSTRUCCIÓN PARA CLAUDE CODE — Docker Setup NeuronGuard AG Agents

## Contexto
Proyecto: NeuronGuard AG Agents Platform
Framework: CrewAI + FastAPI
Despliegue: Docker en Dokploy (servidor VPS con Traefik como reverse proxy)
Dominio API: https://agents-api.neuronguard.site

## Tarea
Genera los siguientes archivos para desplegar el proyecto en Docker via Dokploy:

1. `Dockerfile`
2. `docker-compose.yaml`
3. `requirements.txt`
4. `.env.example` (ya existe — no sobreescribir)

---

## 1. Dockerfile

Requisitos:
- Base: `python:3.11-slim`
- Usar `uv` para instalar dependencias (más rápido que pip)
- Multi-stage build: stage `builder` para deps, stage `runtime` para producción
- Usuario no-root: crear usuario `appuser` (uid 1001)
- Workdir: `/app`
- Puerto expuesto: 8000
- CMD: `uvicorn api.main:app --host 0.0.0.0 --port 8000 --workers 2`
- Variables de entorno: `PYTHONUNBUFFERED=1`, `PYTHONDONTWRITEBYTECODE=1`
- NO incluir archivos .env, .git, __pycache__ (usar .dockerignore)

## 2. docker-compose.yaml

Servicios:
- `neuronguard-agents`: el servicio principal

Configuración del servicio:
- build: contexto `.`, dockerfile `Dockerfile`
- image: `neuronguard-agents:latest`
- restart: `always`
- env_file: `.env`
- ports: NO exponer al host (Traefik gestiona el routing)
- healthcheck: `GET http://localhost:8000/health` cada 30s, timeout 10s, retries 3
- networks: `dokploy-network` (external: true) + `default`
- deploy resources limits: memory 2G, cpus 2.0

Labels de Traefik (para Dokploy):
```
no ponerlas lo hace automaticamente dokploy
```

Network global:
```yaml
networks:
  dokploy-network:
    external: true
```

## 3. requirements.txt

Incluir estas dependencias exactas:
```
crewai>=0.121.0
crewai-tools>=0.47.0
fastapi>=0.115.0
uvicorn[standard]>=0.34.0
qdrant-client>=1.13.0
redis>=5.2.0
httpx>=0.28.0
pydantic>=2.10.0
pydantic-settings>=2.7.0
structlog>=24.4.0
python-dotenv>=1.0.0
litellm>=1.56.0
openai>=1.58.0
```

## 4. .dockerignore

Crear `.dockerignore` con:
```
.env
.env.*
.git
.gitignore
__pycache__
*.pyc
*.pyo
.pytest_cache
.mypy_cache
.ruff_cache
.venv
venv
*.log
docker-compose.override.yml
tests/
docs/
*.md
.claude/
```

## 5. api/main.py (punto de entrada FastAPI)

Crear el archivo de entrada con:
- FastAPI app con título "NeuronGuard AG Agents API"
- Endpoint `GET /health` que retorna `{"status": "ok", "version": "1.0.0"}`
- Incluir router desde `api/routes.py`
- Middleware CORS (permitir origen del panel admin)
- Lifespan para inicializar conexiones (Redis, Qdrant) al arrancar
- Logging estructurado con structlog

## Checklist antes de marcar como completado

- [ ] `docker build -t neuronguard-agents:latest .` sin errores
- [ ] `docker run --env-file .env -p 8000:8000 neuronguard-agents:latest` arranca correctamente
- [ ] `curl http://localhost:8000/health` retorna `{"status": "ok"}`
- [ ] Imagen final < 500MB
- [ ] No hay secretos hardcodeados en ningún archivo
- [ ] .dockerignore excluye .env y archivos sensibles

## Notas importantes

- El proyecto usa Featherless.ai como LLM en dev (OpenAI-compatible, base URL en .env)
- CrewAI usa LiteLLM internamente — configurar modelos con prefijo `openai/` y sobreescribir base URL
- Qdrant ya está desplegado externamente — NO incluir Qdrant en docker-compose
- Redis ya está desplegado externamente — NO incluir Redis en docker-compose
- Solo el servicio `neuronguard-agents` va en docker-compose
