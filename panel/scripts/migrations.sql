-- NeuronGuard AG — InsForge database migrations
-- Run these via InsForge MCP tool: run-raw-sql
-- Or via psql / Supabase SQL editor

-- ── ag_agents ─────────────────────────────────────────────────────────────────
-- (Already exists — only the new LLM columns are added here)
ALTER TABLE ag_agents
  ADD COLUMN IF NOT EXISTS top_k              INTEGER        DEFAULT 0,
  ADD COLUMN IF NOT EXISTS frequency_penalty  DECIMAL(4,2)   DEFAULT 0.0,
  ADD COLUMN IF NOT EXISTS presence_penalty   DECIMAL(4,2)   DEFAULT 0.0,
  ADD COLUMN IF NOT EXISTS repetition_penalty DECIMAL(4,2)   DEFAULT 1.0,
  ADD COLUMN IF NOT EXISTS min_p              DECIMAL(4,3)   DEFAULT 0.0,
  ADD COLUMN IF NOT EXISTS max_iter           INTEGER        DEFAULT 25,
  ADD COLUMN IF NOT EXISTS verbose            BOOLEAN        DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS allow_delegation   BOOLEAN        DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS agent_type         TEXT           DEFAULT 'expert',
  ADD COLUMN IF NOT EXISTS webhook_path       TEXT           DEFAULT '';

-- ── ag_sessions ──────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS ag_sessions (
  id          BIGSERIAL    PRIMARY KEY,
  session_id  TEXT         NOT NULL,
  agent_slug  TEXT         NOT NULL,
  client_id   TEXT,
  created_at  TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS ag_sessions_agent_slug_idx  ON ag_sessions (agent_slug);
CREATE INDEX IF NOT EXISTS ag_sessions_created_at_idx  ON ag_sessions (created_at);
CREATE INDEX IF NOT EXISTS ag_sessions_session_id_idx  ON ag_sessions (session_id);

-- ── ag_usage_logs ────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS ag_usage_logs (
  id               BIGSERIAL    PRIMARY KEY,
  log_id           TEXT         UNIQUE NOT NULL,
  session_id       TEXT         NOT NULL,
  agent_slug       TEXT         NOT NULL,
  client_id        TEXT,
  tokens_used      INTEGER      NOT NULL DEFAULT 0,
  model_used       TEXT         NOT NULL DEFAULT '',
  response_time_ms INTEGER      NOT NULL DEFAULT 0,
  created_at       TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS ag_usage_logs_agent_slug_idx  ON ag_usage_logs (agent_slug);
CREATE INDEX IF NOT EXISTS ag_usage_logs_created_at_idx  ON ag_usage_logs (created_at);
CREATE INDEX IF NOT EXISTS ag_usage_logs_session_id_idx  ON ag_usage_logs (session_id);

-- ── Quick analytics views (optional) ─────────────────────────────────────────

-- Daily requests + tokens over the last 30 days
CREATE OR REPLACE VIEW ag_daily_usage AS
SELECT
  created_at::DATE              AS day,
  COUNT(*)                      AS requests,
  SUM(tokens_used)              AS tokens,
  COUNT(DISTINCT session_id)    AS sessions,
  COUNT(DISTINCT agent_slug)    AS agents_used
FROM ag_usage_logs
WHERE created_at >= NOW() - INTERVAL '30 days'
GROUP BY 1
ORDER BY 1;

-- Top agents by requests (last 7 days)
CREATE OR REPLACE VIEW ag_top_agents_7d AS
SELECT
  agent_slug,
  COUNT(*)          AS requests,
  SUM(tokens_used)  AS tokens,
  AVG(response_time_ms)::INT AS avg_ms
FROM ag_usage_logs
WHERE created_at >= NOW() - INTERVAL '7 days'
GROUP BY 1
ORDER BY 2 DESC;
