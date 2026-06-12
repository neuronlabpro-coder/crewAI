import json
import time
from typing import Any
import redis.asyncio as aioredis
import structlog

from core.config import settings

logger = structlog.get_logger(__name__)


async def _get_redis() -> aioredis.Redis:
    return aioredis.from_url(
        settings.REDIS_URL,
        password=settings.REDIS_PASSWORD or None,
        decode_responses=True,
    )


def _history_key(slug: str, session_id: str) -> str:
    return f"ag:{slug}:history:{session_id}"


async def get_history(slug: str, session_id: str) -> list[dict[str, Any]]:
    """Return conversation history for a session (newest-first order, already sorted)."""
    key = _history_key(slug, session_id)
    try:
        r = await _get_redis()
        raw = await r.get(key)
        await r.aclose()
        if not raw:
            return []
        return json.loads(raw)
    except Exception as exc:
        logger.error("redis.get_history.error", slug=slug, session_id=session_id, error=str(exc))
        return []


async def append_history(slug: str, session_id: str, role: str, content: str) -> None:
    """Append one message to the conversation history and enforce MAX size + TTL."""
    key = _history_key(slug, session_id)
    try:
        r = await _get_redis()
        raw = await r.get(key)
        history: list[dict[str, Any]] = json.loads(raw) if raw else []
        history.append({"role": role, "content": content, "timestamp": time.time()})
        if len(history) > settings.REDIS_HISTORY_MAX:
            history = history[-settings.REDIS_HISTORY_MAX:]
        await r.set(key, json.dumps(history), ex=settings.REDIS_HISTORY_TTL)
        await r.aclose()
    except Exception as exc:
        logger.error("redis.append_history.error", slug=slug, session_id=session_id, error=str(exc))


async def clear_history(slug: str, session_id: str) -> None:
    key = _history_key(slug, session_id)
    try:
        r = await _get_redis()
        await r.delete(key)
        await r.aclose()
    except Exception as exc:
        logger.error("redis.clear_history.error", slug=slug, session_id=session_id, error=str(exc))
