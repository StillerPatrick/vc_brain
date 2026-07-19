"""Regression reproduction for research runs that skip Tavily tools entirely."""

import asyncio
import json

from app.core.config import settings
from app.services import market_research


def _submitted_research() -> dict:
    source = "https://example.com/evidence"
    return {
        "tam": {
            "value_usd": 1_000_000,
            "rationale": "One million buyers at one dollar each.",
            "source_urls": [source],
        },
        "sam": {
            "value_usd": 500_000,
            "rationale": "Half of the sourced market is serviceable.",
            "source_urls": [source],
        },
        "som": {
            "value_usd": 25_000,
            "rationale": "A conservative five percent serviceable share.",
            "source_urls": [source],
        },
        "strengths": [{"text": "The market has documented demand.", "source_urls": [source]}],
        "weaknesses": [{"text": "The startup has limited public proof.", "source_urls": [source]}],
        "opportunities": [{"text": "Demand is expanding.", "source_urls": [source]}],
        "threats": [{"text": "Incumbents serve the same buyers.", "source_urls": [source]}],
        "competitors": [
            {
                "name": "Example incumbent",
                "website_url": "https://example.com/competitor",
                "differentiation": "It already sells to the same buyers.",
                "threat": "high",
                "source_urls": [source],
            }
        ],
        "investment_hypotheses": [
            {
                "text": "Buyers will switch for a measurable cost reduction.",
                "source_urls": [source],
            },
            {
                "text": "The company can reach buyers efficiently.",
                "source_urls": [source],
            },
        ],
        "traction_kpis": [],
        "reality_check": {
            "innovation": "The product automates a documented manual workflow.",
            "rationale": "Demand exists, but public adoption evidence remains early.",
            "score": 60,
            "source_urls": [source],
        },
    }


class _FunctionCall:
    type = "function_call"

    def __init__(self, name, arguments, call_id):
        self.name = name
        self.arguments = json.dumps(arguments)
        self.call_id = call_id

    def model_dump(self, **_kwargs):
        return {
            "type": self.type,
            "name": self.name,
            "call_id": self.call_id,
            "arguments": self.arguments,
        }


class _Response:
    usage = None

    def __init__(self, response_id, output):
        self.id = response_id
        self.output = output


class _FakeResponses:
    def __init__(self):
        self.calls = []

    async def create(self, **kwargs):
        self.calls.append(kwargs)
        responses = [
            # The buggy behavior: a direct submit despite the forced search choice.
            _Response(
                "response_direct_submit",
                [_FunctionCall("submit_research", _submitted_research(), "call_direct")],
            ),
            _Response(
                "response_search",
                [_FunctionCall("web_search", {"query": "Acme market"}, "call_search")],
            ),
            _Response(
                "response_final_submit",
                [_FunctionCall("submit_research", _submitted_research(), "call_final")],
            ),
        ]
        return responses[len(self.calls) - 1]


class _FakeOpenAI:
    instance = None

    def __init__(self, **_kwargs):
        self.responses = _FakeResponses()
        type(self).instance = self


class _FakeTavily:
    instance = None

    def __init__(self):
        self.sources = {}
        self.search_calls = 0
        self.fetch_calls = 0
        type(self).instance = self

    async def __aenter__(self):
        return self

    async def __aexit__(self, *_args):
        return None

    async def search(self, _query):
        self.search_calls += 1
        self.sources["https://example.com/evidence"] = market_research.SourceSnapshot(
            url="https://example.com/evidence",
            title="Evidence",
            domain="example.com",
            favicon_url=None,
            excerpt="Evidence",
            supports=[],
        )
        return {"results": [{"url": "https://example.com/evidence"}]}

    async def fetch(self, _url, _research_question):
        self.fetch_calls += 1
        return {"content": ""}


def test_research_agent_rejects_direct_submit_then_forces_evidence(monkeypatch) -> None:
    """A premature submit cannot bypass the required Tavily search and fetch."""
    monkeypatch.setattr(settings, "openai_api_key", "test-key")
    monkeypatch.setattr(market_research, "AsyncOpenAI", _FakeOpenAI)
    monkeypatch.setattr(market_research, "TavilyResearchTools", _FakeTavily)

    result = asyncio.run(
        market_research.StartupMarketResearchAgent().research(
            company_name="Acme",
            summary_sentences=["Problem.", "Solution.", "Business."],
            sector="Software",
            location="Germany",
            claimed_tam=None,
            claimed_sam=None,
            claimed_som=None,
        )
    )

    tavily = _FakeTavily.instance
    assert tavily is not None
    assert tavily.search_calls == 1
    assert tavily.fetch_calls == 1
    assert result.response_id == "response_final_submit"
    assert result.sources[0].url == "https://example.com/evidence"

    client = _FakeOpenAI.instance
    assert client is not None
    assert [call["tool_choice"] for call in client.responses.calls] == [
        {"type": "function", "name": "web_search"},
        {"type": "function", "name": "web_search"},
        {"type": "function", "name": "submit_research"},
    ]
    assert [tool["name"] for tool in client.responses.calls[1]["tools"]] == [
        "web_search",
        "submit_research",
    ]
