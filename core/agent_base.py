import re
from typing import ClassVar

from crewai import LLM, Agent, Crew, Task
import structlog

from core.config import settings
from core.tools.mcp_tool import MCPSkills
from core.tools.qdrant_tool import QdrantRAG
from core.tools.redis_memory import RedisMemory


log = structlog.get_logger()

_THINK_RE = re.compile(r"<think>.*?</think>", re.DOTALL)
_ORPHAN_CLOSE_RE = re.compile(r"^.*?</think>\s*", re.DOTALL)


def _clean_think_tags(text: str) -> str:
    text = _THINK_RE.sub("", text)
    # Remove any orphaned </think> plus everything before it
    if "</think>" in text:
        text = _ORPHAN_CLOSE_RE.sub("", text)
    return text.strip()


class NeuronGuardAgent:
    """Base class for all NeuronGuard AG agents.

    Subclasses only need to define class-level attributes; run() handles
    the full Redis → Qdrant → MCP → CrewAI → Redis pipeline.
    """

    slug: ClassVar[str] = ""
    name: ClassVar[str] = ""
    role: ClassVar[str] = ""
    goal: ClassVar[str] = ""
    backstory: ClassVar[str] = ""
    qdrant_collection: ClassVar[str] = ""
    llm_model: ClassVar[str] = settings.FEATHERLESS_MODEL_DEEP
    max_tokens: ClassVar[int] = 2048
    temperature: ClassVar[float] = 0.1
    mcp_domains: ClassVar[list[str]] = []

    # ------------------------------------------------------------------ #
    # LLM resolution                                                       #
    # ------------------------------------------------------------------ #

    def _prod_model(self) -> str:
        """Map dev Featherless model → production OpenRouter model."""
        return {
            settings.FEATHERLESS_MODEL_DEEP: settings.OPENROUTER_MODEL_DEEP,
            settings.FEATHERLESS_MODEL_STANDARD: settings.OPENROUTER_MODEL_STANDARD,
            settings.FEATHERLESS_MODEL_TEACHER: settings.OPENROUTER_MODEL_TEACHER,
        }.get(self.llm_model, settings.OPENROUTER_MODEL_STANDARD)

    def _build_llm(self) -> LLM:
        if settings.ENV == "production":
            model_id = self._prod_model()
            return LLM(
                model=f"openai/{model_id}",
                api_key=settings.OPENROUTER_API_KEY,
                base_url=settings.OPENROUTER_BASE_URL,
                max_tokens=self.max_tokens,
                temperature=self.temperature,
            )
        return LLM(
            model=f"openai/{self.llm_model}",
            api_key=settings.FEATHERLESS_API_KEY,
            base_url=settings.FEATHERLESS_BASE_URL,
            max_tokens=self.max_tokens,
            temperature=self.temperature,
        )

    # ------------------------------------------------------------------ #
    # Main entry point                                                     #
    # ------------------------------------------------------------------ #

    async def run(
        self,
        session_id: str,
        client_id: str,
        message: str,
    ) -> dict:
        """Execute the full agent pipeline and return the API response dict."""
        log.info("agent.run.start", slug=self.slug, session_id=session_id)

        memory = RedisMemory(self.slug)
        rag = QdrantRAG()
        mcp = MCPSkills()

        # 1. Conversation history
        history = await memory.get_history(session_id)

        # 2. RAG retrieval
        sources: list[dict] = []
        if self.qdrant_collection:
            sources = await rag.search(message, self.qdrant_collection)

        # 3. MCP skills
        skills = await mcp.get_skills(self.mcp_domains)

        # 4. Assemble task context
        context_parts: list[str] = []
        if history:
            hist_lines = "\n".join(
                f"{m['role'].upper()}: {m['content']}" for m in history[-10:]
            )
            context_parts.append(f"=== Historial de conversación ===\n{hist_lines}")
        if sources:
            rag_lines = "\n\n".join(
                f"[Fuente {i + 1}] {s['content']}" for i, s in enumerate(sources)
            )
            context_parts.append(f"=== Conocimiento de base ===\n{rag_lines}")
        if skills:
            skills_lines = "\n".join(f"- {s}" for s in skills[:15])
            context_parts.append(f"=== Skills disponibles ===\n{skills_lines}")

        context = "\n\n".join(context_parts)
        task_description = (
            f"{context}\n\n=== Mensaje del usuario ===\n{message}"
            if context
            else message
        )

        # 5. Build and run CrewAI crew
        llm = self._build_llm()
        agent = Agent(
            role=self.role,
            goal=self.goal,
            backstory=self.backstory,
            llm=llm,
            verbose=False,
        )
        task = Task(
            description=task_description,
            expected_output="Respuesta completa y técnica al mensaje del usuario.",
            agent=agent,
        )
        crew = Crew(agents=[agent], tasks=[task], verbose=False)
        crew_result = await crew.kickoff_async()

        # 6. Clean DeepSeek <think> tags
        response = _clean_think_tags(str(crew_result))

        # 7. Persist to Redis
        await memory.save_message(session_id, "user", message)
        await memory.save_message(session_id, "assistant", response)

        effective_model = (
            self._prod_model() if settings.ENV == "production" else self.llm_model
        )
        log.info("agent.run.done", slug=self.slug, session_id=session_id)

        return {
            "session_id": session_id,
            "agent": self.slug,
            "response": response,
            "sources": [s["content"][:200] for s in sources],
            "skills_used": self.mcp_domains,
            "tokens_used": 0,
            "model_used": effective_model,
        }
