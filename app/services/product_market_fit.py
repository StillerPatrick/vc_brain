from typing import Any

from app.schemas.metadata import MetricComponent, ProductMarketFitMetric


PMF_THRESHOLD = 60
METHODOLOGY_SOURCES = [
    {
        "title": "Y Combinator: retention is the best PMF measure",
        "url": "https://www.ycombinator.com/blog/startup-school-week-4-recap-kat-manalac-and-gustaf-alstromer/",
    },
    {
        "title": "Sequoia: start with the customer-problem relationship",
        "url": "https://sequoiacap.com/article/pmf-framework/",
    },
    {
        "title": "Superhuman: the 40% customer-pull benchmark",
        "url": "https://review.firstround.com/how-superhuman-built-an-engine-to-find-product-market-fit/",
    },
    {
        "title": "20-year study: early sales traction predicts venture survival",
        "url": "https://journals.aom.org/doi/10.5465/amd.2019.0056",
    },
]


def calculate_product_market_fit(
    *,
    reality_check: dict[str, Any],
    strengths: list[dict[str, Any]] | None,
    weaknesses: list[dict[str, Any]] | None,
    opportunities: list[dict[str, Any]] | None,
    threats: list[dict[str, Any]] | None,
    traction_kpis: list[dict[str, Any]] | None,
    competitors: list[dict[str, Any]] | None,
) -> ProductMarketFitMetric:
    components = [
        _traction_component(traction_kpis),
        _reality_component(reality_check),
        _swot_component(strengths, weaknesses, opportunities, threats),
        _competition_component(competitors),
    ]
    score = max(0, min(100, round(sum(item.score for item in components))))
    if score >= 70:
        verdict = "Strong fit evidence"
    elif score >= 50:
        verdict = "Promising, not proven"
    else:
        verdict = "Fit unproven"
    passes_threshold = score >= PMF_THRESHOLD
    traction_score = components[0].score
    rationale = (
        f"{verdict}: customer evidence contributes {traction_score:.1f}/40 points; "
        "the remaining score tests the researched product thesis against reality, SWOT, and competition."
    )
    return ProductMarketFitMetric(
        score=score,
        threshold=PMF_THRESHOLD,
        verdict=verdict,
        passes_threshold=passes_threshold,
        rationale=rationale,
        components=components,
        methodology_sources=METHODOLOGY_SOURCES,
    )


def _traction_component(
    traction_kpis: list[dict[str, Any]] | None,
) -> MetricComponent:
    kpis = traction_kpis or []
    trust_weight = {"verified": 1.0, "reported": 0.65, "contradicted": 0.0}
    if not kpis:
        quality = 0.0
    else:
        quality = sum(
            trust_weight.get(str(item.get("trust")), 0.0)
            * max(0, min(100, float(item.get("confidence", 0))))
            / 100
            for item in kpis
        ) / len(kpis)
    breadth = min(1.0, len(kpis) / 3)
    score = round(40 * quality * breadth, 1)
    return MetricComponent(
        key="customer_pull",
        label="Customer pull",
        score=score,
        max_score=40,
        explanation=(
            f"{len(kpis)} public traction signals, weighted by verification, confidence, "
            "and breadth; retention or repeat usage is strongest when available."
        ),
    )


def _reality_component(reality_check: dict[str, Any]) -> MetricComponent:
    raw_score = max(0, min(100, float(reality_check.get("score", 0))))
    return MetricComponent(
        key="reality_check",
        label="Reality check",
        score=round(raw_score * 0.3, 1),
        max_score=30,
        explanation=(
            f"Agentic research rated the product thesis {raw_score:.0f}/100 for problem urgency, "
            "differentiation, feasibility, and adoption friction."
        ),
    )


def _swot_component(
    strengths: list[dict[str, Any]] | None,
    weaknesses: list[dict[str, Any]] | None,
    opportunities: list[dict[str, Any]] | None,
    threats: list[dict[str, Any]] | None,
) -> MetricComponent:
    weights = {"high": 3, "medium": 2, "low": 1}
    positive_items = (strengths or []) + (opportunities or [])
    negative_items = (weaknesses or []) + (threats or [])
    positive = sum(weights.get(str(item.get("impact", "medium")), 2) for item in positive_items)
    negative = sum(weights.get(str(item.get("impact", "medium")), 2) for item in negative_items)
    total = positive + negative
    score = round(20 * positive / total, 1) if total else 0.0
    return MetricComponent(
        key="swot_balance",
        label="SWOT balance",
        score=score,
        max_score=20,
        explanation=(
            f"Evidence-weighted upside is {positive} versus {negative} downside points; "
            "high, medium, and low impacts count 3, 2, and 1."
        ),
    )


def _competition_component(
    competitors: list[dict[str, Any]] | None,
) -> MetricComponent:
    items = competitors or []
    penalty = sum(
        {"high": 3.0, "medium": 1.5, "low": 0.5}.get(str(item.get("threat")), 0)
        for item in items
    )
    score = max(0, round(10 - penalty, 1))
    return MetricComponent(
        key="competitive_position",
        label="Competitive position",
        score=score,
        max_score=10,
        explanation=f"Starts at 10 points, then subtracts the threat level of {len(items)} researched competitors.",
    )
