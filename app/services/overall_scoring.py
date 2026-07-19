from app.schemas.applications import OverallScore, OverallScoreComponent


OVERALL_THRESHOLD = 60
WEIGHTS = {
    "team": 0.40,
    "market": 0.30,
    "product_market_fit": 0.30,
}


def calculate_overall_score(
    *, team_score: int, market_score: int, product_market_fit_score: int
) -> OverallScore:
    inputs = (
        ("team", "Team", team_score),
        ("market", "Market", market_score),
        ("product_market_fit", "Product–market fit", product_market_fit_score),
    )
    components = [
        OverallScoreComponent(
            key=key,
            label=label,
            score=max(0, min(100, score)),
            weight=WEIGHTS[key],
            contribution=round(max(0, min(100, score)) * WEIGHTS[key], 1),
        )
        for key, label, score in inputs
    ]
    score = max(0, min(100, round(sum(item.contribution for item in components))))
    if score >= 75:
        verdict = "Strong candidate"
    elif score >= OVERALL_THRESHOLD:
        verdict = "Investment review"
    else:
        verdict = "Below threshold"
    return OverallScore(
        score=score,
        threshold=OVERALL_THRESHOLD,
        verdict=verdict,
        passes_threshold=score >= OVERALL_THRESHOLD,
        rationale=(
            f"The team contributes {components[0].contribution:.1f} points; market and "
            f"product–market fit contribute {components[1].contribution:.1f} and "
            f"{components[2].contribution:.1f} points."
        ),
        components=components,
    )
