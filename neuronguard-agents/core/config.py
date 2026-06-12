from pydantic_settings import BaseSettings, SettingsConfigDict
from functools import lru_cache


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8", extra="ignore")

    # Environment
    ENV: str = "development"
    PORT: int = 8000

    # Featherless (dev LLM + embeddings)
    FEATHERLESS_API_KEY: str
    FEATHERLESS_BASE_URL: str = "https://api.featherless.ai/v1"
    FEATHERLESS_MODEL_DEEP: str = "deepseek-ai/DeepSeek-V4-Pro"
    FEATHERLESS_MODEL_STANDARD: str = "google/gemma-4-26B-A4B-it"
    FEATHERLESS_EMBEDDING_MODEL: str = "Qwen/Qwen3-Embedding-0.6B"
    FEATHERLESS_EMBEDDING_BATCH_SIZE: int = 1
    FEATHERLESS_EMBEDDING_MAX_CONCURRENT: int = 1

    # OpenRouter (prod LLM)
    OPENROUTER_API_KEY: str = ""
    OPENROUTER_BASE_URL: str = "https://openrouter.ai/api/v1"
    OPENROUTER_MODEL_DEEP: str = "anthropic/claude-fable-5"
    OPENROUTER_MODEL_STANDARD: str = "openai/gpt-5.5"

    # Qdrant
    QDRANT_URL: str
    QDRANT_API_KEY: str
    QDRANT_TOP_K: int = 5
    QDRANT_MIN_SCORE: float = 0.7
    QDRANT_EMBED_BATCH_SIZE: int = 1

    # Redis
    REDIS_URL: str
    REDIS_PASSWORD: str = ""
    REDIS_HISTORY_TTL: int = 86400   # 24h
    REDIS_HISTORY_MAX: int = 20

    # InsForge
    INSFORGE_URL: str
    INSFORGE_API_KEY: str

    # MCP Skills
    MCP_SKILLS_URL: str = "https://mcp-skills.shyntai.com"
    MCP_SKILLS_API_KEY: str = ""
    MCP_SKILLS_LIMIT: int = 15

    @property
    def is_production(self) -> bool:
        return self.ENV == "production"


@lru_cache
def get_settings() -> Settings:
    return Settings()


settings = get_settings()
