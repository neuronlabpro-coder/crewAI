# NeuronGuard — Agent Admin Panel

## Migraciones InsForge (ejecutar UNA a la vez)

### Migration 1 — Añadir campos faltantes a ag_agents
```sql
ALTER TABLE ag_agents 
ADD COLUMN IF NOT EXISTS role TEXT,
ADD COLUMN IF NOT EXISTS goal TEXT,
ADD COLUMN IF NOT EXISTS backstory TEXT,
ADD COLUMN IF NOT EXISTS llm_model TEXT DEFAULT 'moonshotai/Kimi-K2.6',
ADD COLUMN IF NOT EXISTS llm_model_prod TEXT DEFAULT 'anthropic/claude-fable-5',
ADD COLUMN IF NOT EXISTS max_tokens INTEGER DEFAULT 2048,
ADD COLUMN IF NOT EXISTS temperature NUMERIC(3,2) DEFAULT 0.1,
ADD COLUMN IF NOT EXISTS mcp_domains JSONB DEFAULT '[]',
ADD COLUMN IF NOT EXISTS agent_type TEXT DEFAULT 'expert',
ADD COLUMN IF NOT EXISTS active BOOLEAN DEFAULT true,
ADD COLUMN IF NOT EXISTS webhook_url TEXT,
ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT NOW(),
ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW()
```

### Migration 2 — Webhook URL generada automáticamente
```sql
UPDATE ag_agents 
SET webhook_url = 'https://api-agents.shyntai.com/agent/' || slug
WHERE webhook_url IS NULL
```

---

## Instrucción para Claude Code — Agent Admin Panel

Crea una aplicación Next.js 14 App Router con Tailwind CSS y Shadcn/UI.
Desplegable en Dokploy. Dominio: `agents-admin.shyntai.com`

### Stack
- Next.js 14 App Router
- TypeScript
- Tailwind CSS + Shadcn/UI
- InsForge/PostgREST como backend (INSFORGE_URL + INSFORGE_API_KEY)
- Sin base de datos propia — todo en InsForge ag_agents

### Estructura de rutas
```
app/
├── page.tsx                    # Dashboard — lista de agentes
├── agents/
│   ├── page.tsx                # Lista completa de agentes
│   ├── new/page.tsx            # Crear nuevo agente
│   └── [slug]/
│       ├── page.tsx            # Ver agente
│       ├── edit/page.tsx       # Editar agente
│       └── playground/page.tsx # Playground del agente
├── api/
│   ├── agents/route.ts         # CRUD via InsForge
│   └── playground/route.ts    # Proxy a api-agents.shyntai.com
```

### Variables de entorno (.env.local)
```
INSFORGE_URL=https://neurona-aplication-backend.shyntai.com
INSFORGE_API_KEY=tu_insforge_api_key
AGENTS_API_URL=https://api-agents.shyntai.com
AGENTS_API_KEY=72063aadc67cc2182825cdc975d334cda9018457cac21863f7ee69504f1eab7a
NEXT_PUBLIC_APP_NAME=NeuronGuard Agent Admin
```

### Páginas y funcionalidades

#### 1. Dashboard (/)
- Contador total de agentes (expertos / docentes)
- Tabla de todos los agentes con columnas:
  - Nombre, Slug, Tipo (Expert/Teacher), Modelo, Estado (activo/inactivo)
  - Botones: Ver | Editar | Playground | Copiar URL
- Filtros: por tipo, por estado, búsqueda por nombre
- Botón "Nuevo Agente" prominente

#### 2. Lista de agentes (/agents)
- Misma tabla del dashboard pero con más detalle
- Vista grid/table toggleable
- Cada card muestra: nombre, slug, tipo, modelo, temperatura

#### 3. Crear/Editar agente (/agents/new y /agents/[slug]/edit)
Formulario completo con estos campos:

**Identidad:**
- `name` — Nombre del agente (texto)
- `slug` — Identificador único (texto, auto-generado desde name, editable)
- `agent_type` — Tipo: Expert | Teacher (select)
- `active` — Activo/Inactivo (toggle)

**CrewAI Config:**
- `role` — Rol del agente (texto corto)
- `goal` — Objetivo (textarea pequeño)
- `backstory` — System prompt completo (textarea grande, monospace)

**LLM Config:**
- `llm_model` — Modelo dev (select con opciones Featherless)
  - moonshotai/Kimi-K2.6
  - moonshotai/Kimi-K2-Thinking
  - deepseek-ai/DeepSeek-V4-Pro
  - zai-org/GLM-5.1
- `llm_model_prod` — Modelo producción (select con opciones OpenRouter)
  - anthropic/claude-fable-5
  - openai/gpt-5.5
- `max_tokens` — Máximo tokens (number, 512-4096)
- `temperature` — Temperatura (slider 0.0 - 1.0, paso 0.05)

**RAG & Skills:**
- `qdrant_collection` — Colección Qdrant (texto, auto: ag_{slug})
- `mcp_domains` — Dominios MCP (tags input, array de strings)
- `skill_keywords` — Keywords de skills (tags input)

**Info generada automáticamente (solo lectura):**
- `webhook_url` — URL del webhook (con botón copiar)
- `created_at`, `updated_at`

#### 4. Playground (/agents/[slug]/playground)
- Chat interface limpia
- Muestra el agente seleccionado (nombre, modelo)
- Input de mensaje con botón enviar
- Historial de conversación en la sesión
- session_id generado automáticamente (UUID)
- Llama a `POST https://api-agents.shyntai.com/agent/{slug}` via proxy Next.js
- Muestra: respuesta, modelo usado, tokens, skills usados
- Botón "Limpiar conversación" (nuevo session_id)
- Botón "Copiar URL webhook" para n8n

### API Routes

#### GET/POST /api/agents
```typescript
// GET — lista todos los agentes desde InsForge
// POST — crea nuevo agente en InsForge ag_agents
```

#### GET/PUT/DELETE /api/agents/[slug]
```typescript
// GET — obtiene agente por slug
// PUT — actualiza agente
// DELETE — desactiva agente (soft delete, active=false)
```

#### POST /api/playground
```typescript
// Proxy a api-agents.shyntai.com/agent/{slug}
// Añade x-api-key header automáticamente
// Retorna respuesta del agente
```

### Diseño UI
- Dark mode por defecto (tema cybersecurity)
- Colores primarios: verde neón (#00ff88) sobre fondo oscuro (#0a0a0f)
- Sidebar izquierdo con navegación
- Tabla de agentes con badge de tipo (Expert=azul, Teacher=verde)
- Badge de estado (Activo=verde, Inactivo=rojo)
- Playground con burbujas de chat estilo terminal

### Docker para Dokploy
Dockerfile simple Next.js standalone:
```dockerfile
FROM node:20-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

FROM node:20-alpine AS runner
WORKDIR /app
ENV NODE_ENV production
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static
COPY --from=builder /app/public ./public
EXPOSE 3001
CMD ["node", "server.js"]
```

docker-compose.yaml sin networks (Dokploy gestiona):
```yaml
services:
  agents-admin:
    build: .
    restart: always
    env_file: .env.local
    healthcheck:
      test: ["CMD", "wget", "-qO-", "http://localhost:3001/api/health"]
      interval: 30s
      timeout: 10s
      retries: 3
```

Puerto: 3001 (para no conflictar con otros servicios en 3000)
