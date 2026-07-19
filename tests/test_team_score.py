from app.models.entities import PersonalityAnalysis
from app.services.team import categorize_team
from app.services.team_score import base_score, compute_score_components


def _analysis(classification: str) -> PersonalityAnalysis:
    return PersonalityAnalysis(
        agreeableness=2.75,
        conscientiousness=3.5,
        extraversion=3.5,
        emotional_stability=3.0,
        openness=4.25,
        classification=classification,
        confidence=0.8,
        summary="s",
        rationale="r",
        model="test",
        source_summary={},
    )


def test_benchmark_matching_team_scores_high():
    # traits exactly on the benchmark, matching the top high-odds combo
    analyses = [_analysis("leader"), _analysis("dev"), _analysis("dev")]
    categorization = categorize_team(analyses)
    components = compute_score_components(categorization, analyses)
    assert components["individual_quality"] == 100
    assert components["configuration"] == 100  # 12.9x combo caps the log scale
    assert components["trait_coverage"] == 100
    assert base_score(components) >= 90


def test_unmatched_solo_founder_scores_lower():
    analyses = [_analysis("fighter")]
    categorization = categorize_team(analyses)
    components = compute_score_components(categorization, analyses)
    assert components["configuration"] == 35
    assert base_score(components) < base_score(
        compute_score_components(
            categorize_team([_analysis("leader"), _analysis("dev"), _analysis("dev")]),
            [_analysis("leader"), _analysis("dev"), _analysis("dev")],
        )
    )
