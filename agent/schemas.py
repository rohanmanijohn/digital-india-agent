"""Structured outputs for each LLM node (enforced as JSON schema by Groq)."""
from typing import Literal

from pydantic import BaseModel, Field

from config import ASPECTS

Sentiment = Literal["positive", "neutral", "negative"]


class AspectSentiment(BaseModel):
    aspect: Literal[tuple(ASPECTS)]  # type: ignore[valid-type]
    sentiment: Sentiment


class Analysis(BaseModel):
    relevant: bool = Field(description="True if the text is feedback about the government digital service/app")
    language: Literal["english", "hinglish", "hindi", "other_indian_language", "other"] = Field(
        description="hindi = Devanagari script; hinglish = Hindi written in Latin script and/or mixed with "
        "English (e.g. 'otp nahi aa raha'); other_indian_language = Tamil, Gujarati, Bengali etc."
    )
    overall_sentiment: Sentiment
    aspects: list[AspectSentiment] = Field(description="Service aspects actually mentioned, each with its own sentiment")
    severity: int = Field(ge=1, le=5, description="1 = minor issue or praise, 5 = citizen blocked from an essential service")
    actionable: bool = Field(description="True if a department could act on this feedback")
    search_query: str = Field(description="Short English description of the citizen's core problem, for searching official guidance")


class Response(BaseModel):
    route_to: str = Field(description="Team best placed to handle it, e.g. 'UIDAI authentication support'")
    reply: str = Field(description="Short, polite reply to the citizen (max 80 words)")
    cited_sources: list[int] = Field(description="Numbers of the official guidance items used; empty if none")


class Check(BaseModel):
    passed: bool
    reason: str = Field(description="One sentence")
