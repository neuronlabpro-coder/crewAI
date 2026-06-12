"""
CrewAI Flow wrapper for NeuronGuard agents.
Provides an alternative orchestration layer on top of the direct agent.run() path.
"""
from __future__ import annotations

from typing import Any
from crewai.flow.flow import Flow, start
from pydantic import BaseModel
import structlog

from agents import AGENT_REGISTRY

logger = structlog.get_logger(__name__)


class AgentFlowState(BaseModel):
    slug: str = ""
    session_id: str = ""
    client_id: str = ""
    message: str = ""
    context: dict[str, Any] = {}
    result: dict[str, Any] = {}


class AgentFlow(Flow[AgentFlowState]):
    """Single-step flow: route to the requested agent and return its output."""

    @start()
    async def run_agent(self) -> dict[str, Any]:
        slug = self.state.slug
        agent_cls = AGENT_REGISTRY.get(slug)
        if not agent_cls:
            raise ValueError(f"Agent '{slug}' not found in registry")

        agent = agent_cls()
        result = await agent.run(
            message=self.state.message,
            session_id=self.state.session_id,
            client_id=self.state.client_id,
            context=self.state.context,
        )
        self.state.result = result
        logger.info("flow.run_agent.ok", slug=slug, session=self.state.session_id)
        return result


async def run_agent_flow(
    slug: str,
    session_id: str,
    message: str,
    client_id: str = "",
    context: dict[str, Any] | None = None,
) -> dict[str, Any]:
    """Convenience wrapper to kick off an AgentFlow."""
    flow = AgentFlow()
    result = await flow.kickoff_async(
        inputs={
            "slug": slug,
            "session_id": session_id,
            "client_id": client_id,
            "message": message,
            "context": context or {},
        }
    )
    return result  # type: ignore[return-value]
