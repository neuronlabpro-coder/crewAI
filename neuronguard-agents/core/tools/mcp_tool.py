from typing import Any
import httpx
import structlog

from core.config import settings

logger = structlog.get_logger(__name__)


async def get_skills(domains: list[str]) -> list[dict[str, Any]]:
    """
    Fetch up to MCP_SKILLS_LIMIT skills filtered by domain list.
    Returns empty list on failure (non-blocking).
    """
    if not domains:
        return []

    domains_param = ",".join(domains)
    url = f"{settings.MCP_SKILLS_URL}/skills"
    params = {"domains": domains_param, "limit": settings.MCP_SKILLS_LIMIT}
    headers: dict[str, str] = {}
    if settings.MCP_SKILLS_API_KEY:
        headers["Authorization"] = f"Bearer {settings.MCP_SKILLS_API_KEY}"

    try:
        async with httpx.AsyncClient(timeout=10.0) as client:
            resp = await client.get(url, params=params, headers=headers)
            resp.raise_for_status()
            data = resp.json()
            return data if isinstance(data, list) else data.get("skills", [])
    except Exception as exc:
        logger.warning("mcp.get_skills.error", domains=domains, error=str(exc))
        return []


def format_skills_context(skills: list[dict[str, Any]]) -> str:
    """Convert skill list into a concise context string for the LLM."""
    if not skills:
        return ""
    lines = ["## Available Skills"]
    for skill in skills:
        name = skill.get("name", "")
        description = skill.get("description", "")
        lines.append(f"- **{name}**: {description}")
    return "\n".join(lines)
