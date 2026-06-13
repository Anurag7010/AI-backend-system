# ai-backend/core/prompt_registry.py

from dataclasses import dataclass
from typing import ClassVar, Optional


@dataclass
class PromptTemplate:
    name: str
    version: str
    system: str  # system prompt content
    user_template: str  # user prompt template with {variable} placeholders
    output_schema: Optional[dict] = None  # expected JSON schema if structured output


class PromptRegistry:
    """
    Single source of truth for all prompts.
    Version string format: "{name}_v{N}" e.g. "qa_v2"
    """

    _prompts: ClassVar[dict[str, PromptTemplate]] = {}

    @classmethod
    def register(cls, template: PromptTemplate) -> None:
        if template.name in cls._prompts:
            raise ValueError(f"Prompt '{template.name}' is already registered.")
        cls._prompts[template.name] = template

    @classmethod
    def get(cls, name: str) -> PromptTemplate:
        if name not in cls._prompts:
            raise ValueError(f"Unknown prompt: {name}. Registered: {list(cls._prompts.keys())}")
        return cls._prompts[name]

    @classmethod
    def render_user(cls, name: str, **kwargs) -> str:
        template = cls.get(name)
        try:
            return template.user_template.format(**kwargs)
        except KeyError as e:
            raise ValueError(f"Missing variable {e} for prompt '{name}'")

    @classmethod
    def all_versions(cls) -> dict[str, str]:
        return {name: t.version for name, t in cls._prompts.items()}


# Register all prompts at module level
PromptRegistry.register(
    PromptTemplate(
        name="qa",
        version="qa_v2",
        system="""You are a precise document assistant. Your job is to answer questions using ONLY the provided document context.

Rules you must follow without exception:

1. Answer ONLY from the provided context — never from general knowledge
2. If the context does not contain enough information, say exactly: "I don't have enough information in the provided documents to answer this question."
3. Always cite your sources using [Source N] notation where N is the source number
4. Be concise and direct — no unnecessary preamble
5. Never say "As an AI language model" or similar disclaimers
6. If asked something outside the document domain, respond: "That question is outside the scope of the provided documents."

Output format:
- Answer in clear prose
- Include [Source N] citations inline where you use information from that source
- Keep answers under 500 words unless the question requires more detail""",
        user_template="""Context from documents:

{context}

Question: {question}

Answer (cite sources inline using [Source N] notation):""",
        output_schema=None,
    )
)

PromptRegistry.register(
    PromptTemplate(
        name="summarization",
        version="summarization_v1",
        system="""You are a document summarization assistant. Produce clear, structured summaries.

Rules:
1. Summarize only what is in the provided text — no external knowledge
2. Preserve key facts, numbers, and conclusions
3. Structure: one paragraph overview + bullet points for key details
4. Keep summaries under 300 words

Output format (JSON):
{
  "overview": "one paragraph summary",
  "key_points": ["point 1", "point 2", ...],
  "word_count": N
}""",
        user_template="Text to summarize:\n\n{document}",
        output_schema={
            "type": "object",
            "required": ["overview", "key_points", "word_count"],
            "properties": {
                "overview": {"type": "string"},
                "key_points": {"type": "array", "items": {"type": "string"}},
                "word_count": {"type": "integer"},
            },
        },
    )
)

PromptRegistry.register(
    PromptTemplate(
        name="extraction",
        version="extraction_v1",
        system="""You are a data extraction assistant. Extract specific fields from documents.

Rules:
1. Extract ONLY what is explicitly stated in the document
2. Use null for fields not found — never guess or infer
3. Output valid JSON matching the requested schema exactly

Output format: valid JSON only — no prose, no markdown, no explanation""",
        user_template="""Document:

{document}

Extract these fields: {fields}

Output as JSON:""",
        output_schema=None,
    )
)

PromptRegistry.register(
    PromptTemplate(
        name="off_topic_check",
        version="off_topic_check_v1",
        system="""You are a query classifier. Determine if a user query is relevant to the provided document domain.

Output exactly one of:
- "relevant" — the query is about the document content
- "irrelevant" — the query is unrelated to the document content

Output the single word only. No explanation.""",
        user_template="""Document domain: {domain_description}

User query: {query}

Classification:""",
        output_schema=None,
    )
)

PromptRegistry.register(
    PromptTemplate(
        name="query_variants",
        version="query_variants_v1",
        system="""You are a query expansion assistant. Generate alternative phrasings of a question to improve document retrieval.

Rules:
1. Generate exactly 3 alternative phrasings
2. Each phrasing should approach the question from a different angle
3. Keep the same meaning — do not change what is being asked
4. Output as JSON array of strings

Output format: ["variant 1", "variant 2", "variant 3"]""",
        user_template="Original query: {query}\n\nAlternative phrasings (JSON array):",
        output_schema={"type": "array", "items": {"type": "string"}, "minItems": 3, "maxItems": 3},
    )
)
