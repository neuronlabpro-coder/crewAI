"""
Base class for all NeuronGuard agents.
Subclasses only define class-level attributes — the base handles everything else.
NEVER modify without team consensus.
"""
from __future__ import annotations

import re
from typing import Any, ClassVar
import structlog
from openai import AsyncOpenAI

from core.config import settings
from core.tools.redis_memory import get_history, append_history
from core.tools.qdrant_tool import search_collection
from core.tools.mcp_tool import get_skills, format_skills_context

logger = structlog.get_logger(__name__)

_THINK_RE = re.compile(r"<think>.*?</think>", re.DOTALL)


def _clean(text: str) -> str:
    """Strip DeepSeek <think>…</think> blocks before returning to client."""
    return _THINK_RE.sub("", text).strip()


def _llm_client(model: str) -> tuple[AsyncOpenAI, str]:
    """Return (AsyncOpenAI client, resolved model id) for dev or prod."""
    if settings.is_production:
        return (
            AsyncOpenAI(
                api_key=settings.OPENROUTER_API_KEY,
                base_url=settings.OPENROUTER_BASE_URL,
                default_headers={"HTTP-Referer": "https://neuronguard.site"},
                max_retries=2,
                timeout=60.0,
            ),
            model,  # prod model already set per agent
        )
    return (
        AsyncOpenAI(
            api_key=settings.FEATHERLESS_API_KEY,
            base_url=settings.FEATHERLESS_BASE_URL,
            max_retries=3,
            timeout=60.0,
        ),
        model,  # dev model set per agent
    )


class NeuronGuardAgent:
    # ── Subclass MUST override these ──────────────────────────────────────────
    slug: ClassVar[str] = ""
    name: ClassVar[str] = ""
    role: ClassVar[str] = ""
    goal: ClassVar[str] = ""
    backstory: ClassVar[str] = ""
    qdrant_collection: ClassVar[str] = ""
    llm_model: ClassVar[str] = ""           # dev model (Featherless)
    llm_model_prod: ClassVar[str] = ""      # prod model (OpenRouter)
    max_tokens: ClassVar[int] = 2048
    temperature: ClassVar[float] = 0.1
    top_p: ClassVar[float] = 1.0
    top_k: ClassVar[int] = 0
    frequency_penalty: ClassVar[float] = 0.0
    presence_penalty: ClassVar[float] = 0.0
    repetition_penalty: ClassVar[float] = 1.0
    min_p: ClassVar[float] = 0.0
    max_iter: ClassVar[int] = 25
    verbose: ClassVar[bool] = False
    allow_delegation: ClassVar[bool] = False
    mcp_domains: ClassVar[list[str]] = []
    # ──────────────────────────────────────────────────────────────────────────

    async def run(
        self,
        message: str,
        session_id: str,
        client_id: str = "",
        context: dict[str, Any] | None = None,
    ) -> dict[str, Any]:
        """
        Main entry point.
        1. Load Redis history
        2. Search Qdrant for relevant context
        3. Fetch MCP skills
        4. Call LLM (OpenAI-compatible API)
        5. Persist history
        6. Return structured response
        """
        log = logger.bind(agent=self.slug, session=session_id)

        # 1. History
        history = await get_history(self.slug, session_id)
        await append_history(self.slug, session_id, "user", message)

        # 2. RAG
        rag_results = await search_collection(self.qdrant_collection, message)
        rag_sources: list[str] = []
        rag_context = ""
        if rag_results:
            chunks = []
            for r in rag_results:
                payload = r.get("payload", {})
                text = payload.get("text") or payload.get("content") or ""
                source = payload.get("source") or payload.get("file") or ""
                if text:
                    chunks.append(text)
                if source:
                    rag_sources.append(source)
            if chunks:
                rag_context = "\n\n## Relevant Knowledge Base\n" + "\n---\n".join(chunks)

        # 3. MCP Skills
        skills = await get_skills(self.mcp_domains)
        skills_used = [s.get("name", "") for s in skills if s.get("name")]
        skills_context = format_skills_context(skills)

        # 4. Build messages
        system_content = self.backstory
        if rag_context:
            system_content += "\n\n" + rag_context
        if skills_context:
            system_content += "\n\n" + skills_context

        messages: list[dict[str, str]] = [{"role": "system", "content": system_content}]
        for entry in history[-10:]:  # last 10 turns (5 exchanges)
            messages.append({"role": entry["role"], "content": entry["content"]})
        messages.append({"role": "user", "content": message})

        # 5. LLM call
        active_model = self.llm_model_prod if settings.is_production else self.llm_model
        client, resolved_model = _llm_client(active_model)

        try:
            extra: dict = {}
            if self.top_k:             extra["top_k"]              = self.top_k
            if self.frequency_penalty: extra["frequency_penalty"]  = self.frequency_penalty
            if self.presence_penalty:  extra["presence_penalty"]   = self.presence_penalty
            if self.repetition_penalty != 1.0: extra["repetition_penalty"] = self.repetition_penalty
            if self.min_p:             extra["min_p"]              = self.min_p

            completion = await client.chat.completions.create(
                model=resolved_model,
                messages=messages,   # type: ignore[arg-type]
                max_tokens=self.max_tokens,
                temperature=self.temperature,
                top_p=self.top_p,
                extra_body=extra if extra else None,
            )
            raw_response = completion.choices[0].message.content or ""
            tokens_used = completion.usage.total_tokens if completion.usage else 0
        except Exception as exc:
            log.error("llm.call.error", model=resolved_model, error=str(exc))
            raise

        response = _clean(raw_response)

        # 6. Persist assistant turn
        await append_history(self.slug, session_id, "assistant", response)

        log.info("agent.run.ok", model=resolved_model, tokens=tokens_used)

        return {
            "session_id": session_id,
            "agent": self.slug,
            "response": response,
            "sources": list(set(rag_sources)),
            "skills_used": skills_used,
            "tokens_used": tokens_used,
            "model_used": resolved_model,
        }
