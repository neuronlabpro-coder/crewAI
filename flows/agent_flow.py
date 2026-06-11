from __future__ import annotations

import os
import re
from typing import TYPE_CHECKING


# Suppress CrewAI's interactive tracing prompt on every fresh container
os.environ.setdefault("CREWAI_TRACING_ENABLED", "false")

from crewai import Agent, Crew, Task
from crewai.flow.flow import Flow, start
from pydantic import BaseModel
import structlog


if TYPE_CHECKING:
    from core.agent_base import NeuronGuardAgent

log = structlog.get_logger()

_THINK_RE = re.compile(r"<think>.*?</think>", re.DOTALL)


class _FlowState(BaseModel):
    role: str = ""
    goal: str = ""
    backstory: str = ""
    task_description: str = ""
    result: str = ""


class _CrewFlow(Flow[_FlowState]):
    """Internal CrewAI Flow that runs a single Agent + Task."""

    def __init__(self, llm: object) -> None:
        super().__init__()
        self._llm = llm

    @start()
    async def execute_crew(self) -> None:
        agent = Agent(
            role=self.state.role,
            goal=self.state.goal,
            backstory=self.state.backstory,
            llm=self._llm,
            verbose=False,
        )
        task = Task(
            description=self.state.task_description,
            expected_output="Respuesta técnica completa al mensaje del usuario.",
            agent=agent,
        )
        crew = Crew(agents=[agent], tasks=[task], verbose=False)
        raw = await crew.kickoff_async()
        self.state.result = _THINK_RE.sub("", str(raw)).strip()


class AgentFlow:
    """Public entry point: assembles context and delegates execution to _CrewFlow."""

    @staticmethod
    async def kickoff(
        agent: NeuronGuardAgent,
        session_id: str,
        client_id: str,
        message: str,
        rag_context: list[dict],
        skills: list[str],
        history: list[dict] | None = None,
    ) -> str:
        """Build full context and run the agent crew, returning a clean response."""
        context_parts: list[str] = []

        if history:
            hist = "\n".join(
                f"{m['role'].upper()}: {m['content']}" for m in history[-10:]
            )
            context_parts.append(f"=== Historial de conversación ===\n{hist}")

        if rag_context:
            rag = "\n\n".join(
                f"[Fuente {i + 1}] {s.get('content', '')}"
                for i, s in enumerate(rag_context)
            )
            context_parts.append(f"=== Conocimiento de base ===\n{rag}")

        if skills:
            sk = "\n".join(f"- {s}" for s in skills[:15])
            context_parts.append(f"=== Skills disponibles ===\n{sk}")

        context = "\n\n".join(context_parts)
        task_description = (
            f"{context}\n\n=== Mensaje del usuario ===\n{message}"
            if context
            else message
        )

        llm = agent._build_llm()
        flow = _CrewFlow(llm)
        flow.state.role = agent.role
        flow.state.goal = agent.goal
        flow.state.backstory = agent.backstory
        flow.state.task_description = task_description

        log.info("agent_flow.kickoff", slug=agent.slug, session_id=session_id)
        await flow.kickoff_async()

        return flow.state.result
