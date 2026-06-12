CREATE TABLE ag_agents (
  id                BIGSERIAL PRIMARY KEY,
  slug              TEXT UNIQUE NOT NULL,
  name              TEXT NOT NULL,
  role              TEXT,
  goal              TEXT,
  backstory         TEXT,
  llm_model         TEXT,
  llm_model_prod    TEXT,
  max_tokens        INTEGER DEFAULT 2048,
  temperature       FLOAT DEFAULT 0.1,
  mcp_domains       TEXT[],
  qdrant_collection TEXT,
  agent_type        TEXT DEFAULT 'expert',
  active            BOOLEAN DEFAULT TRUE,
  webhook_url       TEXT,
  created_at        TIMESTAMPTZ DEFAULT NOW(),
  updated_at        TIMESTAMPTZ DEFAULT NOW()
);

CREATE TRIGGER set_updated_at
  BEFORE UPDATE ON ag_agents
  FOR EACH ROW EXECUTE FUNCTION system.update_updated_at();
