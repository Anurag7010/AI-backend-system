"""
core/prompt_engine.py

Single entry point for all prompt construction.
Business logic must never hardcode prompt strings — always call render() here.

Template registry:
    "qa"            → prompts/templates/qa.py           (question, context)
    "summarization" → prompts/templates/summarization.py (document)
    "extraction"    → prompts/templates/extraction.py    (document, fields)
    "rag"           → prompts/templates/rag.py            (question, context)

Usage:
    from core.prompt_engine import render
    prompt = render("qa", question="What is X?", context="X is ...")
"""

from observability.logger import get_logger
from prompts.templates import extraction, qa, rag, summarization

logger = get_logger(__name__)

# ── Template registry ────────────────────────────────────────────────────────
# Maps template name → (template string, required kwarg names)
_REGISTRY: dict[str, tuple[str, list[str]]] = {
    "qa": (qa.TEMPLATE, ["question", "context"]),
    "summarization": (summarization.TEMPLATE, ["document"]),
    "extraction": (extraction.TEMPLATE, ["document", "fields"]),
    "rag": (rag.TEMPLATE, ["question", "context"]),
}


def list_templates() -> list[str]:
    """Return all registered template names."""
    return list(_REGISTRY.keys())


def render(template_name: str, **kwargs) -> str:
    """
    Render a named prompt template with the supplied keyword arguments.

    Args:
        template_name: One of "qa", "summarization", "extraction", "rag".
        **kwargs:      Template variables (must match the template's required keys).

    Returns:
        Fully rendered prompt string, ready to pass to call_llm().

    Raises:
        ValueError: Unknown template name, or missing / extra variables.
    """
    if template_name not in _REGISTRY:
        raise ValueError(
            f"[prompt_engine] Unknown template '{template_name}'. " f"Available: {list_templates()}"
        )

    template_str, required_keys = _REGISTRY[template_name]

    # Validate required variables are all present
    missing = [k for k in required_keys if k not in kwargs]
    if missing:
        raise ValueError(
            f"[prompt_engine] Template '{template_name}' requires: {required_keys}. "
            f"Missing: {missing}"
        )

    # Normalize the 'fields' variable for the extraction template
    if "fields" in kwargs and isinstance(kwargs["fields"], list):
        kwargs = {**kwargs, "fields": ", ".join(kwargs["fields"])}

    try:
        rendered = template_str.format(**kwargs)
    except KeyError as exc:
        raise ValueError(
            f"[prompt_engine] Template '{template_name}' has an unexpected "
            f"placeholder {exc} not covered by provided kwargs."
        ) from exc

    logger.debug(f"[prompt_engine] Rendered '{template_name}' " f"({len(rendered)} chars)")
    return rendered
