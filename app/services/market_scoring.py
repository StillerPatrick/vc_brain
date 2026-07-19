import math
from typing import Any

from app.schemas.metadata import MarketMetric, MetricComponent


INVESTMENT_AMOUNT_EUR = 100_000
INVESTMENT_THRESHOLD = 60


def calculate_market_metric(
    *,
    tam: float,
    sam: float,
    som: float,
    market_sizing: dict[str, Any] | None,
    traction_kpis: list[dict[str, Any]] | None,
    competitors: list[dict[str, Any]] | None,
) -> MarketMetric:
    """Produce an explainable market-only score after agentic research completes."""
    components = [
        _size_component(
            key="tam",
            label="TAM scale",
            value=tam,
            floor=10_000_000,
            ceiling=10_000_000_000,
            maximum=25,
        ),
        _size_component(
            key="sam",
            label="SAM scale",
            value=sam,
            floor=1_000_000,
            ceiling=1_000_000_000,
            maximum=25,
        ),
        _size_component(
            key="som",
            label="SOM scale",
            value=som,
            floor=100_000,
            ceiling=100_000_000,
            maximum=30,
        ),
        _evidence_component(market_sizing),
        _traction_component(traction_kpis),
        _competition_component(competitors),
    ]
    score = round(sum(component.score for component in components))
    score = max(0, min(100, score))
    worth_investing = score >= INVESTMENT_THRESHOLD
    verdict = "Invest" if worth_investing else "Pass"
    rationale = (
        f"{verdict} on a €{INVESTMENT_AMOUNT_EUR:,} market check: "
        f"the independently researched TAM/SAM/SOM contribute "
        f"{round(sum(item.score for item in components[:3]))}/80 points."
    )
    return MarketMetric(
        score=score,
        investment_amount_eur=INVESTMENT_AMOUNT_EUR,
        investment_threshold=INVESTMENT_THRESHOLD,
        worth_investing=worth_investing,
        rationale=rationale,
        components=components,
    )


def _size_component(
    *,
    key: str,
    label: str,
    value: float,
    floor: float,
    ceiling: float,
    maximum: int,
) -> MetricComponent:
    safe_value = max(0, value)
    if safe_value <= floor:
        score = 0.0
    elif safe_value >= ceiling:
        score = float(maximum)
    else:
        score = maximum * math.log10(safe_value / floor) / math.log10(
            ceiling / floor
        )
    return MetricComponent(
        key=key,
        label=label,
        score=round(score, 1),
        max_score=maximum,
        explanation=(
            f"Research estimate {_compact_usd(safe_value)}; scored logarithmically "
            f"between {_compact_usd(floor)} and {_compact_usd(ceiling)}."
        ),
    )


def _evidence_component(
    market_sizing: dict[str, Any] | None,
) -> MetricComponent:
    urls = {
        str(url)
        for estimate in (market_sizing or {}).values()
        if isinstance(estimate, dict)
        for url in estimate.get("source_urls", [])
    }
    score = min(8, len(urls) * 2)
    return MetricComponent(
        key="evidence",
        label="Sizing evidence",
        score=score,
        max_score=8,
        explanation=f"{len(urls)} distinct sources support the market estimates.",
    )


def _traction_component(
    traction_kpis: list[dict[str, Any]] | None,
) -> MetricComponent:
    trust_weight = {"verified": 1.0, "reported": 0.65, "contradicted": 0.0}
    evidence = sum(
        trust_weight.get(str(item.get("trust")), 0.0)
        * max(0, min(100, float(item.get("confidence", 0))))
        / 100
        for item in (traction_kpis or [])
    )
    score = min(7, round(evidence * 2.5, 1))
    return MetricComponent(
        key="traction",
        label="Market traction",
        score=score,
        max_score=7,
        explanation=f"{len(traction_kpis or [])} researched traction signals were weighted by trust and confidence.",
    )


def _competition_component(
    competitors: list[dict[str, Any]] | None,
) -> MetricComponent:
    threats = [str(item.get("threat")) for item in (competitors or [])]
    penalty = sum({"high": 1.5, "medium": 0.75, "low": 0.25}.get(item, 0) for item in threats)
    score = max(0, round(5 - penalty, 1))
    return MetricComponent(
        key="competition",
        label="Competitive room",
        score=score,
        max_score=5,
        explanation=f"Competitive headroom after {len(threats)} researched competitor threat assessments.",
    )


def _compact_usd(value: float) -> str:
    for size, suffix in (
        (1_000_000_000, "B"),
        (1_000_000, "M"),
        (1_000, "K"),
    ):
        if value >= size:
            return f"${value / size:.1f}{suffix}"
    return f"${value:,.0f}"
