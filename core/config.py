from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore",
    )

    # App
    ENV: str = "development"
    PORT: int = 8000
    HOST: str = "0.0.0.0"
    LOG_LEVEL: str = "INFO"
    CREWAI_DISABLE_TELEMETRY: bool = True
    OTEL_SDK_DISABLED: bool = True
    MAX_MESSAGE_LENGTH: int = 5000
    AG_GATEWAY_API_KEY: str = ""

    # Featherless (dev LLM — OpenAI-compatible)
    FEATHERLESS_API_KEY: str = ""
    FEATHERLESS_BASE_URL: str = "https://api.featherless.ai/v1"
    FEATHERLESS_MODEL_DEEP: str = "deepseek-ai/DeepSeek-V4-Pro"
    FEATHERLESS_MODEL_STANDARD: str = "moonshotai/Kimi-K2.6"
    FEATHERLESS_MODEL_TEACHER: str = "zai-org/GLM-5.1"
    FEATHERLESS_EMBEDDING_MODEL: str = "Qwen/Qwen3-Embedding-0.6B"
    FEATHERLESS_EMBEDDING_BATCH_SIZE: int = 1
    FEATHERLESS_EMBEDDING_MAX_CONCURRENT: int = 1

    # Tokaine (data loader)
    TOKAINE_API_KEY: str = ""
    TOKAINE_BASE_URL: str = "https://api.tokaine.co"
    TOKAINE_MODEL: str = "qwen-flagship"

    # OpenRouter (production LLM)
    OPENROUTER_API_KEY: str = ""
    OPENROUTER_BASE_URL: str = "https://openrouter.ai/api/v1"
    OPENROUTER_MODEL_DEEP: str = "anthropic/claude-fable-5"
    OPENROUTER_MODEL_STANDARD: str = "openai/gpt-5.5"
    OPENROUTER_MODEL_TEACHER: str = "openai/gpt-5.5"
    OPENROUTER_SITE_URL: str = "https://neuronguard.site"
    OPENROUTER_APP_NAME: str = "NeuronGuard AG Agents"

    # Qdrant
    QDRANT_URL: str = "https://vectordatarag.neuronguard.site"
    QDRANT_API_KEY: str = ""
    QDRANT_COLLECTION_DIM: int = 1024
    QDRANT_TOP_K: int = 5
    QDRANT_SCORE_THRESHOLD: float = 0.7
    QDRANT_EMBED_BATCH_SIZE: int = 1

    # Redis
    REDIS_HOST: str = "localhost"
    REDIS_PORT: int = 6379
    REDIS_PASSWORD: str = ""
    REDIS_DB: int = 2
    REDIS_HISTORY_TTL: int = 86400
    REDIS_HISTORY_MAX: int = 20

    # InsForge / PostgREST
    INSFORGE_URL: str = "https://neurona-aplication-backend.shyntai.com"
    INSFORGE_API_KEY: str = ""

    # MCP Skills
    MCP_SKILLS_URL: str = "https://mcp-skills.shyntai.com"
    MCP_SKILLS_API_KEY: str = ""
    MCP_SKILLS_LIMIT: int = 15

    # N8N webhooks
    N8N_WEBHOOK_BASE: str = ""
    N8N_API_KEY: str = ""


settings = Settings()
