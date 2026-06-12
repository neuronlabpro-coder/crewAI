from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import Any
import structlog

from agents import AGENT_REGISTRY

logger = structlog.get_logger(__name__)

router = APIRouter()


class AgentRequest(BaseModel):
    session_id: str
    client_id: str = ""
    message: str
    context: dict[str, Any] | None = None


class AgentResponse(BaseModel):
    session_id: str
    agent: str
    response: str
    sources: list[str]
    skills_used: list[str]
    tokens_used: int
    model_used: str


@router.get("/health")
async def health() -> dict[str, str]:
    return {"status": "ok"}


@router.get("/agents")
async def list_agents() -> list[dict[str, str]]:
    return [
        {"slug": slug, "name": cls.name, "role": cls.role}
        for slug, cls in AGENT_REGISTRY.items()
    ]


@router.post("/agent/{slug}", response_model=AgentResponse)
async def run_agent(slug: str, body: AgentRequest) -> AgentResponse:
    agent_cls = AGENT_REGISTRY.get(slug)
    if not agent_cls:
        raise HTTPException(status_code=404, detail=f"Agent '{slug}' not found")

    agent = agent_cls()
    try:
        result = await agent.run(
            message=body.message,
            session_id=body.session_id,
            client_id=body.client_id,
            context=body.context,
        )
    except Exception as exc:
        logger.error("route.agent.error", slug=slug, error=str(exc))
        raise HTTPException(status_code=500, detail=str(exc))

    return AgentResponse(**result)
