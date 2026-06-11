import asyncio

from openai import AsyncOpenAI
from qdrant_client import AsyncQdrantClient
from qdrant_client.models import ScoredPoint
import structlog

from core.config import settings


log = structlog.get_logger()


class QdrantRAG:
    """RAG search against a Qdrant collection using sequential embeddings."""

    def __init__(self) -> None:
        self._embed_client: AsyncOpenAI | None = None
        self._qdrant_client: AsyncQdrantClient | None = None

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
            self._qdrant_client = AsyncQdrantClient(
                url=settings.QDRANT_URL,
                api_key=settings.QDRANT_API_KEY or None,
            )
        return self._qdrant_client

    async def _embed_sequential(self, texts: list[str]) -> list[list[float]]:
        """Embed texts one at a time — NEVER in parallel (Featherless slot budget)."""
        client = self._get_embed_client()
        embeddings: list[list[float]] = []
        for i, text in enumerate(texts):
            response = await client.embeddings.create(
                model=settings.FEATHERLESS_EMBEDDING_MODEL,
                input=[text],
            )
            embeddings.append(response.data[0].embedding)
            if i < len(texts) - 1:
                await asyncio.sleep(0.5)
        return embeddings

    async def search(
        self,
        query: str,
        collection: str,
        top_k: int | None = None,
    ) -> list[dict]:
        """Search Qdrant and return results above QDRANT_SCORE_THRESHOLD."""
        k = top_k if top_k is not None else settings.QDRANT_TOP_K
        try:
            vectors = await self._embed_sequential([query])
            query_vector = vectors[0]

            qdrant = self._get_qdrant_client()
            results: list[ScoredPoint] = await qdrant.search(
                collection_name=collection,
                query_vector=query_vector,
                limit=k,
                score_threshold=settings.QDRANT_SCORE_THRESHOLD,
            )

            return [
                {
                    "id": str(r.id),
                    "score": r.score,
                    "content": (r.payload or {}).get("content", ""),
                    "metadata": r.payload or {},
                }
                for r in results
            ]
        except Exception:
            log.exception(
                "qdrant.search.error", collection=collection, query=query[:120]
            )
            return []
