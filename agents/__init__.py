import importlib
from pathlib import Path
import pkgutil

from core.agent_base import NeuronGuardAgent
import structlog


log = structlog.get_logger()

AGENT_REGISTRY: dict[str, type[NeuronGuardAgent]] = {}


class AgentNotFoundError(Exception):
    pass


class AgentFactory:
    @staticmethod
    def get(slug: str) -> NeuronGuardAgent:
        """Return a fresh NeuronGuardAgent instance for the given slug."""
        if slug not in AGENT_REGISTRY:
            raise AgentNotFoundError(f"Agent '{slug}' not found in registry")
        return AGENT_REGISTRY[slug]()

    @staticmethod
    def list_slugs() -> list[str]:
        return sorted(AGENT_REGISTRY.keys())


def _auto_register() -> None:
    """Import every agent module and register subclasses of NeuronGuardAgent."""
    agents_dir = Path(__file__).parent
    for module_info in pkgutil.iter_modules([str(agents_dir)]):
        if module_info.name.startswith("_"):
            continue
        try:
            module = importlib.import_module(f"agents.{module_info.name}")
        except Exception:
            log.exception("agent_registry.import_error", module=module_info.name)
            continue

        for obj in vars(module).values():
            if (
                isinstance(obj, type)
                and issubclass(obj, NeuronGuardAgent)
                and obj is not NeuronGuardAgent
                and obj.slug
            ):
                AGENT_REGISTRY[obj.slug] = obj
                log.debug("agent_registry.registered", slug=obj.slug)


_auto_register()
