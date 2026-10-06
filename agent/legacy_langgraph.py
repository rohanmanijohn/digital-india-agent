"""LangGraph agent: analyse citizen feedback -> draft response -> independent check.

    analyze ──(relevant & needs action?)──> draft_response ──> self_check ──(fail, retries left)──> draft_response
       └──────────────── otherwise ──────────────> END                  └──(pass)──> END
"""
from typing import Literal, Optional, TypedDict

from langchain_groq import ChatGroq
from langgraph.graph import END, StateGraph
from pydantic import BaseModel, Field

from config import ASPECTS, GROQ_API_KEY, MODEL_JUDGE, MODEL_RESPONDER, MODEL_TAGGER

MAX_REDRAFTS = 1


# ---------- structured outputs ----------
class AspectSentiment(BaseModel):
    aspect: Literal[tuple(ASPECTS)]  # type: ignore[valid-type]
    sentiment: Literal["positive", "neutral", "negative"]


class Analysis(BaseModel):
    relevant: bool = Field(description="True if the text is feedback about the government digital service/app")
    language: Literal["english", "hinglish", "hindi", "other"]
    overall_sentiment: Literal["positive", "neutral", "negative"]
    aspects: list[AspectSentiment] = Field(description="Service aspects mentioned, each with its own sentiment")
    severity: int = Field(ge=1, le=5, description="1 = minor/praise, 5 = citizen blocked from an essential service")
    actionable: bool = Field(description="True if a department could act on this feedback")


class Response(BaseModel):
    route_to: str = Field(description="Team best placed to handle it, e.g. 'UIDAI authentication support'")
    reply: str = Field(description="Short, polite reply to the citizen (max 80 words)")


class Check(BaseModel):
    passed: bool
    reason: str


class AgentState(TypedDict, total=False):
    text: str
    app_name: str
    analysis: Analysis
    response: Optional[Response]
    check: Optional[Check]
    redrafts: int


def _llm(model: str) -> ChatGroq:
    return ChatGroq(model=model, api_key=GROQ_API_KEY, temperature=0, max_retries=4)


# gpt-oss supports strict JSON-schema output on Groq; Qwen doesn't reliably, so the judge uses JSON mode.
# with_retry re-asks on the occasional malformed generation.
tagger = _llm(MODEL_TAGGER).with_structured_output(Analysis, method="json_schema").with_retry(stop_after_attempt=3)
responder = _llm(MODEL_RESPONDER).with_structured_output(Response, method="json_schema").with_retry(stop_after_attempt=3)
judge = _llm(MODEL_JUDGE).with_structured_output(Check, method="json_mode").with_retry(stop_after_attempt=3)


# ---------- nodes ----------
def analyze(state: AgentState) -> AgentState:
    prompt = (
        "You analyse citizen feedback on Indian government digital services. "
        "Text may be English, Hindi or Hinglish (code-mixed). Only tag aspects actually mentioned.\n\n"
        f"App: {state['app_name']}\nFeedback: {state['text']}"
    )
    return {"analysis": tagger.invoke(prompt), "redrafts": 0}


def draft_response(state: AgentState) -> AgentState:
    a = state["analysis"]
    feedback_note = ""
    if state.get("check") and not state["check"].passed:
        feedback_note = f"\nA reviewer rejected your previous draft because: {state['check'].reason}. Fix this."
    prompt = (
        "You are a helpdesk officer for an Indian government digital service. Write a reply to this citizen "
        "and decide which team should handle it. Be empathetic and specific. Never invent helpline numbers, "
        "URLs, deadlines or policies; never promise outcomes.\n\n"
        f"App: {state['app_name']}\nFeedback: {state['text']}\n"
        f"Detected issues: {[x.aspect for x in a.aspects]}, severity {a.severity}/5{feedback_note}"
    )
    return {"response": responder.invoke(prompt), "redrafts": state.get("redrafts", 0) + (1 if state.get("check") else 0)}


def self_check(state: AgentState) -> AgentState:
    r = state["response"]
    prompt = (
        "Check this government helpdesk reply. Fail it if it invents contact details, URLs, policies or "
        "deadlines, promises an outcome, ignores the citizen's actual problem, or is impolite.\n\n"
        f"Citizen feedback: {state['text']}\nReply: {r.reply}\nRouted to: {r.route_to}\n\n"
        'Respond with JSON only, exactly: {"passed": true or false, "reason": "<one sentence>"}'
    )
    return {"check": judge.invoke(prompt)}


# ---------- routing ----------
def needs_response(state: AgentState) -> str:
    a = state["analysis"]
    return "draft_response" if a.relevant and a.actionable and a.overall_sentiment != "positive" else END


def after_check(state: AgentState) -> str:
    return END if state["check"].passed or state["redrafts"] >= MAX_REDRAFTS else "draft_response"


def build_graph():
    g = StateGraph(AgentState)
    g.add_node("analyze", analyze)
    g.add_node("draft_response", draft_response)
    g.add_node("self_check", self_check)
    g.set_entry_point("analyze")
    g.add_conditional_edges("analyze", needs_response, ["draft_response", END])
    g.add_edge("draft_response", "self_check")
    g.add_conditional_edges("self_check", after_check, ["draft_response", END])
    return g.compile()
