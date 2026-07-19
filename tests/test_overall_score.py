from app.services.overall_scoring import calculate_overall_score


def test_overall_score_gives_team_a_higher_weight() -> None:
    result = calculate_overall_score(
        team_score=80,
        market_score=60,
        product_market_fit_score=40,
    )

    assert result.score == 62
    assert result.passes_threshold is True
    assert [component.weight for component in result.components] == [0.4, 0.3, 0.3]
    assert [component.contribution for component in result.components] == [32, 18, 12]


def test_overall_score_is_clamped() -> None:
    result = calculate_overall_score(
        team_score=120,
        market_score=-10,
        product_market_fit_score=100,
    )

    assert result.score == 70
    assert all(0 <= component.score <= 100 for component in result.components)
