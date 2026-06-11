from datetime import datetime, timezone
from typing import Any
import uuid

from core.config import settings
from fastapi import APIRouter, HTTPException, Header
from pydantic import BaseModel, Field, field_validator
import structlog


log = structlog.get_logger()
router = APIRouter()


class AgentRequest(BaseModel):
    session_id: str
    client_id: str
    message: str = Field(..., min_length=1, max_length=5000)
    context: dict[str, Any] | None = None

    @field_validator("message")
    @classmethod
    def message_not_blank(cls, v: str) -> str:
        if not v.strip():
            raise ValueError("message cannot be blank")
        return v.strip()


class AgentResponse(BaseModel):
    session_id: str
    agent: str
    response: str
    sources: list[str]
    skills_used: list[str]
    tokens_used: int
    model_used: str
    request_id: str
    timestamp: str


@router.post("/agent/{slug}", response_model=AgentResponse)
async def agent_endpoint(
    slug: str,
    body: AgentRequest,
    x_api_key: str | None = Header(default=None),
) -> AgentResponse:
    request_id = str(uuid.uuid4())
    log.info(
        "agent.request",
        slug=slug,
        session_id=body.session_id,
        client_id=body.client_id,
        request_id=request_id,
    )

    # Auth — skip check when AG_GATEWAY_API_KEY is not configured
    if settings.AG_GATEWAY_API_KEY and x_api_key != settings.AG_GATEWAY_API_KEY:
        log.warning("agent.auth.failed", slug=slug, request_id=request_id)
        raise HTTPException(status_code=401, detail="Invalid or missing x-api-key")

    # Belt-and-suspenders length check (Pydantic already enforces max_length)
    if len(body.message) > settings.MAX_MESSAGE_LENGTH:
        raise HTTPException(
            status_code=400,
            detail=f"message exceeds {settings.MAX_MESSAGE_LENGTH} characters",
        )

    # Resolve agent from registry
    from agents import AgentFactory, AgentNotFoundError  # noqa: PLC0415

    try:
        agent = AgentFactory.get(slug)
    except AgentNotFoundError:
        log.warning("agent.not_found", slug=slug, request_id=request_id)
        raise HTTPException(status_code=404, detail=f"Agent '{slug}' not found")

    # Execute pipeline
    try:
        result = await agent.run(
            session_id=body.session_id,
            client_id=body.client_id,
            message=body.message,
        )
    except Exception as exc:
        log.exception(
            "agent.run.error",
            slug=slug,
            request_id=request_id,
            error=str(exc),
        )
        raise HTTPException(status_code=500, detail="Agent execution failed")

    log.info(
        "agent.response",
        slug=slug,
        request_id=request_id,
        tokens=result.get("tokens_used", 0),
    )

    return AgentResponse(
        session_id=result["session_id"],
        agent=result["agent"],
        response=result["response"],
        sources=result.get("sources", []),
        skills_used=result.get("skills_used", []),
        tokens_used=result.get("tokens_used", 0),
        model_used=result.get("model_used", ""),
        request_id=request_id,
        timestamp=datetime.now(timezone.utc).isoformat(),
    )
