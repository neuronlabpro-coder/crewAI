import asyncio
from typing import Any
from openai import AsyncOpenAI
import httpx
import structlog

from core.config import settings

logger = structlog.get_logger(__name__)

_embeddings_client = AsyncOpenAI(
    api_key=settings.FEATHERLESS_API_KEY,
    base_url=settings.FEATHERLESS_BASE_URL,
    max_retries=3,
    timeout=30.0,
)


async def _embed(text: str) -> list[float]:
    """Embed a single text string using Featherless Qwen3-Embedding-0.6B."""
    response = await _embeddings_client.embeddings.create(
        model=settings.FEATHERLESS_EMBEDDING_MODEL,
        input=[text],
    )
    return response.data[0].embedding


async def search_collection(collection: str, query: str) -> list[dict[str, Any]]:
    """
    Search a Qdrant collection and return top-K results above min score.
    Returns list of {score, payload} dicts.
    """
    try:
        vector = await _embed(query)
    except Exception as exc:
        logger.error("qdrant.embed.error", collection=collection, error=str(exc))
        return []

    url = f"{settings.QDRANT_URL}/collections/{collection}/points/search"
    payload = {
        "vector": vector,
        "limit": settings.QDRANT_TOP_K,
        "score_threshold": settings.QDRANT_MIN_SCORE,
        "with_payload": True,
    }
    headers = {"api-key": settings.QDRANT_API_KEY, "Content-Type": "application/json"}

    try:
        async with httpx.AsyncClient(timeout=15.0) as client:
            resp = await client.post(url, json=payload, headers=headers)
            resp.raise_for_status()
            data = resp.json()
            return data.get("result", [])
    except Exception as exc:
        logger.error("qdrant.search.error", collection=collection, error=str(exc))
        return []


async def embed_chunks_sequential(chunks: list[str]) -> list[list[float]]:
    """
    Embed chunks one by one — NEVER in parallel (Featherless slot budget).
    """
    embeddings: list[list[float]] = []
    for i, chunk in enumerate(chunks):
        try:
            embedding = await _embeddings_client.embeddings.create(
                model=settings.FEATHERLESS_EMBEDDING_MODEL,
                input=[chunk],
            )
            embeddings.append(embedding.data[0].embedding)
        except Exception as exc:
            logger.error("qdrant.embed_chunk.error", index=i, error=str(exc))
            embeddings.append([0.0] * 1024)
        if i < len(chunks) - 1:
            await asyncio.sleep(0.5)
    return embeddings
