import httpx
import structlog

from core.config import settings


log = structlog.get_logger()


class MCPSkills:
    """Fetches relevant skills from the MCP Skills Server filtered by domain."""

    async def get_skills(self, domains: list[str]) -> list[str]:
        """Return up to MCP_SKILLS_LIMIT skills matching the given domains."""
        if not domains:
            return []
        try:
            params: dict[str, str | int] = {
                "domains": ",".join(domains),
                "limit": settings.MCP_SKILLS_LIMIT,
            }
            headers: dict[str, str] = {}
            if settings.MCP_SKILLS_API_KEY:
                headers["Authorization"] = f"Bearer {settings.MCP_SKILLS_API_KEY}"

            async with httpx.AsyncClient(timeout=10.0) as client:
                response = await client.get(
                    f"{settings.MCP_SKILLS_URL}/skills",
                    params=params,
                    headers=headers,
                )
                response.raise_for_status()
                data = response.json()

            items: list = data if isinstance(data, list) else data.get("skills", [])
            skills: list[str] = []
            for item in items:
                if isinstance(item, str):
                    skills.append(item)
                elif isinstance(item, dict):
                    name = item.get("name", "")
                    desc = item.get("description", "")
                    skills.append(f"{name}: {desc}" if desc else name)
            return skills
        except Exception:
            log.exception("mcp.get_skills.error", domains=domains)
            return []
