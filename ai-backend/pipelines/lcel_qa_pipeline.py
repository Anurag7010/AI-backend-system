"""
LCEL (LangChain Expression Language) implementation of the QA pipeline.

Parallel implementation to rag_interface.py for learning purposes.
Decision: LCEL used for standard RAG chain + callbacks; manual code used for
agent loop, memory, guardrails, output validation (see docs/architecture.md).
"""
from operator import itemgetter
from typing import Callable, Awaitable

from langchain_openai import ChatOpenAI
from langchain_core.prompts import ChatPromptTemplate
from langchain_core.output_parsers import StrOutputParser
from langchain_core.runnables import RunnableLambda

from core.config import config
from observability.langchain_callback import ObservabilityCallback


def build_qa_chain(retriever_fn: Callable[[str], Awaitable[list[dict]]]):
    """
    Build a LCEL QA chain.

    Args:
        retriever_fn: async function(query: str) -> list[dict]
                      wraps our existing retrieve() from rag_interface

    Returns:
        A Runnable chain: input {"question": str} → output str (the answer)

    Chain structure:
        {context: retriever, question: passthrough}
        | prompt_template
        | llm
        | output_parser
    """
    llm = ChatOpenAI(
        model=config.MODEL_NAME,
        temperature=config.TEMPERATURE,
        api_key=config.OPENAI_API_KEY,
        streaming=False,
    )

    prompt = ChatPromptTemplate.from_messages([
        ("system", (
            "You are a precise document assistant. Answer questions using ONLY the provided context.\n"
            "If the context does not contain enough information, say: "
            '"I don\'t have enough information in the provided documents."\n'
            "Always cite sources using [Source N] notation."
        )),
        ("human", "Context:\n{context}\n\nQuestion: {question}\n\nAnswer (with [Source N] citations):"),
    ])

    async def retrieve_and_format(query: str) -> str:
        """Retrieve chunks and format as numbered context string."""
        chunks = await retriever_fn(query)
        if not chunks:
            return "No relevant information found in documents."
        return "\n\n".join(
            f"[Source {i + 1}]\n{chunk.get('content', '')}"
            for i, chunk in enumerate(chunks)
        )

    retriever_runnable = RunnableLambda(retrieve_and_format)

    chain = (
        {
            "context": itemgetter("question") | retriever_runnable,
            "question": itemgetter("question"),
        }
        | prompt
        | llm
        | StrOutputParser()
    )
    return chain


async def run_lcel_qa(
    question: str,
    retriever_fn: Callable[[str], Awaitable[list[dict]]],
    trace_id: str = "",
) -> dict:
    """
    Run the LCEL QA pipeline for a question.

    Returns same shape as rag_interface.ask() for comparison:
        {answer, sources, trace_id, latency_breakdown, pipeline}
    """
    import time

    start = time.time()
    callback = ObservabilityCallback(trace_id=trace_id)
    chain = build_qa_chain(retriever_fn)

    answer = await chain.ainvoke(
        {"question": question},
        config={"callbacks": [callback]},
    )

    total_ms = int((time.time() - start) * 1000)
    return {
        "answer": answer,
        "sources": [],  # LCEL chain does not return structured sources
        "trace_id": trace_id,
        "latency_breakdown": {
            "retrieval_ms": 0,   # tracked in callback logs
            "generation_ms": 0,
            "total_ms": total_ms,
        },
        "pipeline": "lcel",
    }
