from datetime import datetime, timezone
import json

import redis.asyncio as aioredis
import structlog

from core.config import settings


log = structlog.get_logger()


class RedisMemory:
    """Manages per-session conversation history in Redis."""

    def __init__(self, slug: str) -> None:
        self.slug = slug
        self._client: aioredis.Redis | None = None

    def _get_client(self) -> aioredis.Redis:
        if self._client is None:
            self._client = aioredis.Redis(
                host=settings.REDIS_HOST,
                port=settings.REDIS_PORT,
                password=settings.REDIS_PASSWORD or None,
                db=settings.REDIS_DB,
                decode_responses=True,
            )
        return self._client

    def _key(self, session_id: str) -> str:
        return f"ag:{self.slug}:history:{session_id}"

    async def get_history(self, session_id: str) -> list[dict]:
        """Return stored conversation history for this session."""
        try:
            client = self._get_client()
            raw = await client.get(self._key(session_id))
            if raw:
                return json.loads(raw)  # type: ignore[no-any-return]
        except Exception:
            log.exception(
                "redis.get_history.error", slug=self.slug, session_id=session_id
            )
        return []

    async def save_message(self, session_id: str, role: str, content: str) -> None:
        """Append a message to history, capping at REDIS_HISTORY_MAX entries."""
        try:
            client = self._get_client()
            key = self._key(session_id)
            history = await self.get_history(session_id)
            history.append(
                {
                    "role": role,
                    "content": content,
                    "timestamp": datetime.now(timezone.utc).isoformat(),
                }
            )
            if len(history) > settings.REDIS_HISTORY_MAX:
                history = history[-settings.REDIS_HISTORY_MAX :]
            await client.set(key, json.dumps(history), ex=settings.REDIS_HISTORY_TTL)
        except Exception:
            log.exception(
                "redis.save_message.error", slug=self.slug, session_id=session_id
            )

    async def close(self) -> None:
        if self._client is not None:
            await self._client.aclose()
            self._client = None
