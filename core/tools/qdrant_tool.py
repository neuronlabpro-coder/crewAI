import asyncio
import hashlib
import json
from urllib.parse import urlparse

from openai import AsyncOpenAI
from qdrant_client import AsyncQdrantClient
import redis.asyncio as aioredis
import structlog

from core.config import settings


log = structlog.get_logger()

_EMBED_TTL = 7 * 24 * 3600  # 7 days — vectors are deterministic
_RAG_TTL = 3600              # 1 hour for results with hits
_RAG_EMPTY_TTL = 300         # 5 min for empty results (collection may be populated soon)


class QdrantRAG:
    """RAG search with Redis cache for embeddings and results."""

    def __init__(self) -> None:
        self._embed_client: AsyncOpenAI | None = None
        self._qdrant_client: AsyncQdrantClient | None = None
        self._redis: aioredis.Redis | None = None

    def _get_embed_client(self) -> AsyncOpenAI:
        if self._embed_client is None:
            self._embed_client = AsyncOpenAI(
                api_key=settings.FEATHERLESS_API_KEY,
                base_url=settings.FEATHERLESS_BASE_URL,
                max_retries=3,
                timeout=30.0,
            )
        return self._embed_client

    def _get_qdrant_client(self) -> AsyncQdrantClient:
        if self._qdrant_client is None:
            parsed = urlparse(settings.QDRANT_URL)
            is_https = parsed.scheme == "https"
            # qdrant_client falls back to port 6333 when URL has no explicit port,
            # ignoring the HTTPS default (443). Use host/port/https to avoid this.
            port = parsed.port or (443 if is_https else 6333)
            self._qdrant_client = AsyncQdrantClient(
                host=parsed.hostname,
                port=port,
                https=is_https,
                api_key=settings.QDRANT_API_KEY or None,
                check_compatibility=False,
            )
        return self._qdrant_client

    def _get_redis(self) -> aioredis.Redis:
        if self._redis is None:
            self._redis = aioredis.Redis(
                host=settings.REDIS_HOST,
                port=settings.REDIS_PORT,
                password=settings.REDIS_PASSWORD or None,
                db=settings.REDIS_DB,
                decode_responses=True,
            )
        return self._redis

    @staticmethod
    def _hash(text: str) -> str:
        return hashlib.sha256(text.encode()).hexdigest()[:32]

    async def _embed_sequential(self, texts: list[str]) -> list[list[float]]:
        """Embed texts one at a time with Redis cache.
        Only sleeps between consecutive real API calls (Featherless slot budget)."""
        client = self._get_embed_client()
        redis = self._get_redis()
        embeddings: list[list[float]] = []
        last_was_api_call = False

        for text in texts:
            embed_key = f"ag:embed:{self._hash(text)}"

            # Try cache first
            try:
                cached = await redis.get(embed_key)
                if cached:
                    embeddings.append(json.loads(cached))
                    last_was_api_call = False
                    log.debug("embed.cache_hit", key=embed_key[:20])
                    continue
            except Exception as exc:
                log.debug("embed.cache_miss", reason=str(exc)[:60])

            # Sleep only before consecutive real API calls
            if last_was_api_call:
                await asyncio.sleep(0.5)

            response = await client.embeddings.create(
                model=settings.FEATHERLESS_EMBEDDING_MODEL,
                input=[text],
            )
            vector = response.data[0].embedding
            embeddings.append(vector)
            last_was_api_call = True

            try:
                await redis.set(embed_key, json.dumps(vector), ex=_EMBED_TTL)
            except Exception as exc:
                log.debug("embed.cache_set_failed", reason=str(exc)[:60])

        return embeddings

    async def search(
        self,
        query: str,
        collection: str,
        top_k: int | None = None,
    ) -> list[dict]:
        """Search Qdrant with Redis cache for embeddings and RAG results."""
        k = top_k if top_k is not None else settings.QDRANT_TOP_K
        redis = self._get_redis()

        # Check full RAG results cache
        rag_key = f"ag:rag:{collection}:{self._hash(query)}"
        try:
            cached_rag = await redis.get(rag_key)
            if cached_rag:
                hits = json.loads(cached_rag)
                log.debug("qdrant.rag.cache_hit", collection=collection, hits=len(hits))
                return hits
        except Exception as exc:
            log.debug("qdrant.rag.cache_miss", reason=str(exc)[:60])

        try:
            vectors = await self._embed_sequential([query])
            query_vector = vectors[0]

            qdrant = self._get_qdrant_client()
            results = await qdrant.query_points(
                collection_name=collection,
                query=query_vector,
                limit=k,
                score_threshold=settings.QDRANT_SCORE_THRESHOLD,
                with_payload=True,
            )

            hits = [
                {
                    "id": str(r.id),
                    "score": r.score,
                    "content": (r.payload or {}).get("content", ""),
                    "metadata": r.payload or {},
                }
                for r in results.points
            ]

            # Cache results — shorter TTL for empty collections
            ttl = _RAG_TTL if hits else _RAG_EMPTY_TTL
            try:
                await redis.set(rag_key, json.dumps(hits), ex=ttl)
            except Exception as exc:
                log.debug("qdrant.rag.cache_set_failed", reason=str(exc)[:60])

            return hits

        except Exception:
            log.exception(
                "qdrant.search.error", collection=collection, query=query[:120]
            )
            return []
