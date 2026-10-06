"""Google ADK 2.x graph workflow: analyse -> retrieve (RAG) -> draft -> independent check (-> redraft).

    START -> analyzer -> after_analysis --SKIP----------------------------------------> finalize
                                        \--RESPOND--> retrieve -> responder -> store_draft -> checker -> after_check
                                                                     ^                                   |  |
                                                                     \-------------REDRAFT---------------/  \--DONE--> finalize

LLM nodes are ADK Agents on Groq (via LiteLLM); routing/RAG/bookkeeping are plain Python function nodes.
Nodes share data through session state; agent instructions read it with {key} templating.
"""
import logging
import time
import uuid

from google.adk import Agent, Event, Runner, Workflow
from google.adk.models.lite_llm import LiteLlm
from google.adk.sessions import InMemorySessionService
from google.adk.workflow import RetryConfig, node
from google.genai import types

from agent.schemas import Analysis, Check, Response
from config import APPS, MODEL_JUDGE, MODEL_RESPONDER, MODEL_TAGGER
from rag import retriever

logging.getLogger("LiteLLM").setLevel(logging.WARNING)

MAX_REDRAFTS = 1
# Retries cover Groq's occasional empty/invalid JSON generation and free-tier per-minute rate limits
# (backoff 5s, 10s, 20s, 40s outlasts a one-minute window).
RETRY = RetryConfig(max_attempts=5, initial_delay=5.0, max_delay=60.0)


def _groq(model_id: str, **kwargs) -> LiteLlm:
    return LiteLlm(model=f"groq/{model_id}", temperature=0, **kwargs)


# ---------- LLM nodes ----------
ANALYZER_INSTRUCTION = (
    "You analyse citizen feedback on Indian government digital services. The user message is one "
    "Google Play review of the app {app_name}. It may be English, Hindi, Hinglish (code-mixed) or another "
    "Indian language. Only tag aspects that are actually mentioned."
)


def _make_analyzer(name: str) -> Agent:
    # An ADK agent can belong to only one workflow, so the batch-analysis workflow gets its own identical copy.
    return Agent(
        name=name,
        # Groq counts requested max_tokens against tokens-per-minute, so keep the cap close to real usage (~250)
        model=_groq(MODEL_TAGGER, reasoning_effort="low", max_tokens=500),
        instruction=ANALYZER_INSTRUCTION,
        output_schema=Analysis,
    )


analyzer = _make_analyzer("analyzer")

RESPONDER_INSTRUCTION = (
    "You are a helpdesk officer for the Indian government app {app_name}. Write a reply to the citizen and "
    "decide which team should handle it.\n\n"
    "Citizen review: {review_text}\n"
    "Detected issues: {issues} (severity {severity}/5)\n\n"
    "Official guidance previously published by this app's team (numbered):\n{kb_context}\n\n"
    "Rules: be empathetic and specific to the citizen's problem. Contact details, URLs, phone numbers, "
    "menu names and procedures may ONLY come from the official guidance above; if it has none, give no "
    "contact details. Never invent policies or deadlines and never promise an outcome. List the numbers of "
    "the guidance items you used in cited_sources.\n{check_feedback}"
)


def _make_responder(name: str) -> Agent:
    return Agent(
        name=name,
        model=_groq(MODEL_RESPONDER, reasoning_effort="medium", max_tokens=1500),
        instruction=RESPONDER_INSTRUCTION,
        output_schema=Response,
    )


responder = _make_responder("responder")

checker = Agent(
    name="checker",
    # Groq's free tier caps this model at 1,000 output tokens/min, so no hidden reasoning and a small cap.
    model=_groq(MODEL_JUDGE, reasoning_effort="none", max_tokens=300),
    instruction=(
        "You audit replies drafted for a government helpdesk.\n\n"
        "Citizen review: {review_text}\n"
        "Official guidance the drafter was given:\n{kb_context}\n\n"
        "Draft reply: {reply}\nRouted to: {route_to}\n\n"
        "Fail the draft if ANY contact detail, URL, phone number, menu name, procedure or policy in it does not "
        "appear in the official guidance, if it promises an outcome, if it ignores the citizen's actual problem, "
        "or if it is impolite. Otherwise pass it."
    ),
    output_schema=Check,
)


# ---------- function nodes ----------
NO_GUIDANCE = "(none available - do not give any contact details)"


def format_kb_context(hits: list[dict]) -> str:
    return "\n".join(f"[{i + 1}] {h['text']}" for i, h in enumerate(hits)) or NO_GUIDANCE


def after_analysis(ctx, node_input: dict):
    ctx.state["analysis"] = node_input
    ctx.state["issues"] = ", ".join(a["aspect"] for a in node_input["aspects"]) or "none detected"
    ctx.state["severity"] = node_input["severity"]
    ctx.state["trace"] = ctx.state["trace"] + ["analyze"]
    needs_reply = node_input["relevant"] and node_input["actionable"] and node_input["overall_sentiment"] != "positive"
    return Event(route="RESPOND" if needs_reply else "SKIP")


def retrieve(ctx):
    # use_rag=False is the RQ4 ablation: identical pipeline, but the responder gets no official guidance
    hits = retriever.search(
        ctx.state["analysis"]["search_query"],
        ctx.state["app_id"],
        exclude_review_id=ctx.state["exclude_review_id"],
    ) if ctx.state["use_rag"] else []
    ctx.state["sources"] = hits
    ctx.state["kb_context"] = format_kb_context(hits)
    ctx.state["trace"] = ctx.state["trace"] + ["retrieve"]
    return Event(output="Draft the reply now.")


def store_draft(ctx, node_input: dict):
    ctx.state["response"] = node_input
    ctx.state["reply"] = node_input["reply"]
    ctx.state["route_to"] = node_input["route_to"]
    ctx.state["trace"] = ctx.state["trace"] + ["draft" if ctx.state["redrafts"] == 0 else "redraft"]
    return Event(output="Check this draft.")


def after_check(ctx, node_input: dict):
    ctx.state["check"] = node_input
    ctx.state["trace"] = ctx.state["trace"] + ["check"]
    if node_input["passed"] or ctx.state["redrafts"] >= MAX_REDRAFTS:
        return Event(route="DONE")
    ctx.state["redrafts"] = ctx.state["redrafts"] + 1
    ctx.state["check_feedback"] = (
        f"A reviewer rejected your previous draft because: {node_input['reason']} Fix this in the new draft."
    )
    return Event(route="REDRAFT")


def finalize(ctx):
    ctx.state["trace"] = ctx.state["trace"] + ["finalize"]
    return Event(output="done")


# Wrap each agent once: the graph identifies nodes by object, and responder is reused by the REDRAFT loop.
analyzer_node = node(analyzer, retry_config=RETRY)
responder_node = node(responder, retry_config=RETRY)
checker_node = node(checker, retry_config=RETRY)

root_workflow = Workflow(
    name="citizen_feedback_workflow",
    edges=[
        ("START", analyzer_node, after_analysis),
        (after_analysis, {"RESPOND": retrieve, "SKIP": finalize}),
        (retrieve, responder_node, store_draft, checker_node, after_check),
        (after_check, {"REDRAFT": responder_node, "DONE": finalize}),
    ],
)

_sessions = InMemorySessionService()
_runner = Runner(node=root_workflow, session_service=_sessions)
_APP_NAMES = {name: app_id for app_id, (name, _) in APPS.items()}


async def run_pipeline(
    text: str, app_name: str, exclude_review_id: str | None = None, use_rag: bool = True
) -> dict:
    """Run one review through the workflow and return a flat, JSON-serialisable result."""
    t0 = time.perf_counter()
    user_id = "pipeline"
    session = await _sessions.create_session(
        app_name=_runner.app_name,
        user_id=user_id,
        session_id=str(uuid.uuid4()),
        state={
            "app_name": app_name,
            "app_id": _APP_NAMES[app_name],
            "review_text": text,
            "exclude_review_id": exclude_review_id,
            "use_rag": use_rag,
            "check_feedback": "",
            "redrafts": 0,
            "trace": [],
        },
    )
    async for _ in _runner.run_async(
        user_id=user_id,
        session_id=session.id,
        new_message=types.Content(role="user", parts=[types.Part(text=text)]),
    ):
        pass
    s = (await _sessions.get_session(app_name=_runner.app_name, user_id=user_id, session_id=session.id)).state
    await _sessions.delete_session(app_name=_runner.app_name, user_id=user_id, session_id=session.id)

    responded = "response" in s
    return {
        "app_name": app_name,
        "text": text,
        "analysis": s["analysis"],
        "response": s.get("response"),
        "check": s.get("check"),
        "sources": [
            {"n": i + 1, "source": h["source"], "score": h["score"], "text": h["text"]}
            for i, h in enumerate(s.get("sources", []))
        ],
        "redrafts": s["redrafts"],
        "needs_human_review": responded and not s["check"]["passed"],
        "trace": s["trace"],
        "latency_ms": round((time.perf_counter() - t0) * 1000),
        "models": {"analyzer": MODEL_TAGGER, "responder": MODEL_RESPONDER, "checker": MODEL_JUDGE},
    }


# ---------- analysis-only workflow (RQ1-RQ3 batch runs: no reply drafting, far fewer tokens) ----------
def store_analysis(ctx, node_input: dict):
    ctx.state["analysis"] = node_input
    return Event(output="done")


analysis_workflow = Workflow(
    name="analysis_only_workflow",
    edges=[("START", node(_make_analyzer("batch_analyzer"), retry_config=RETRY), store_analysis)],
)
_analysis_runner = Runner(node=analysis_workflow, session_service=_sessions)


async def run_analysis_only(text: str, app_name: str) -> dict:
    """Run only the analyzer node; returns the Analysis dict."""
    session = await _sessions.create_session(
        app_name=_analysis_runner.app_name, user_id="batch", session_id=str(uuid.uuid4()),
        state={"app_name": app_name},
    )
    async for _ in _analysis_runner.run_async(
        user_id="batch", session_id=session.id,
        new_message=types.Content(role="user", parts=[types.Part(text=text)]),
    ):
        pass
    s = (await _sessions.get_session(app_name=_analysis_runner.app_name, user_id="batch", session_id=session.id)).state
    await _sessions.delete_session(app_name=_analysis_runner.app_name, user_id="batch", session_id=session.id)
    if "analysis" not in s:
        raise RuntimeError("analyzer produced no output")
    return s["analysis"]


# ---------- draft-only workflow (RQ4 RAG ablation: same responder prompt/model, first draft only) ----------
def store_first_draft(ctx, node_input: dict):
    ctx.state["response"] = node_input
    return Event(output="done")


draft_workflow = Workflow(
    name="draft_only_workflow",
    edges=[("START", node(_make_responder("ablation_responder"), retry_config=RETRY), store_first_draft)],
)
_draft_runner = Runner(node=draft_workflow, session_service=_sessions)


async def run_draft_only(text: str, app_name: str, analysis: dict, kb_context: str) -> dict:
    """One responder call with a given guidance context (retrieved hits, or NO_GUIDANCE)."""
    session = await _sessions.create_session(
        app_name=_draft_runner.app_name, user_id="ablation", session_id=str(uuid.uuid4()),
        state={
            "app_name": app_name,
            "review_text": text,
            "issues": ", ".join(a["aspect"] for a in analysis["aspects"]) or "none detected",
            "severity": analysis["severity"],
            "kb_context": kb_context,
            "check_feedback": "",
        },
    )
    async for _ in _draft_runner.run_async(
        user_id="ablation", session_id=session.id,
        new_message=types.Content(role="user", parts=[types.Part(text="Draft the reply now.")]),
    ):
        pass
    s = (await _sessions.get_session(app_name=_draft_runner.app_name, user_id="ablation", session_id=session.id)).state
    await _sessions.delete_session(app_name=_draft_runner.app_name, user_id="ablation", session_id=session.id)
    if "response" not in s:
        raise RuntimeError("responder produced no output")
    return s["response"]
