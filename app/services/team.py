from collections import Counter
from typing import Any, Iterable

from app.models.entities import PersonalityAnalysis


TRAIT_BENCHMARKS = {
    "openness": 85,
    "conscientiousness": 70,
    "extraversion": 70,
    "agreeableness": 55,
    "emotional_stability": 60,
}

HIGH_ODDS_COMBINATIONS = [
    ({"leader": 1, "dev": 2}, 12.9),
    ({"dev": 2, "operator": 1}, 8.6),
    ({"engineer": 1, "leader": 1, "dev": 1}, 8.4),
    ({"accomplisher": 3}, 2.9),
    ({"dev": 1, "operator": 1}, 2.1),
    ({"accomplisher": 2}, 1.8),
]


def categorize_team(analyses: Iterable[PersonalityAnalysis]) -> dict[str, Any]:
    analyses = list(analyses)
    if not analyses:
        return {
            "ensemble": "Pending analysis",
            "archetypes": [],
            "configuration_odds": None,
            "matched_roles": [],
            "nearest_roles": [],
            "missing_roles": [],
            "team_big5": {},
            "trait_gaps": list(TRAIT_BENCHMARKS),
            "analyzed_count": 0,
        }

    roles = [analysis.classification for analysis in analyses]
    available = Counter(roles)
    evaluated = [
        {
            "roles": role_counts,
            "odds": odds,
            "missing": _missing_roles(available, role_counts),
        }
        for role_counts, odds in HIGH_ODDS_COMBINATIONS
    ]
    matched = sorted(
        (item for item in evaluated if not item["missing"]),
        key=lambda item: item["odds"],
        reverse=True,
    )
    nearest = sorted(
        evaluated,
        key=lambda item: (len(item["missing"]), -item["odds"]),
    )[0]
    selected = matched[0] if matched else nearest

    team_big5 = {
        trait: round(max(getattr(analysis, trait) for analysis in analyses) * 20, 1)
        for trait in TRAIT_BENCHMARKS
    }
    gaps = [
        trait
        for trait, benchmark in TRAIT_BENCHMARKS.items()
        if team_big5[trait] < benchmark
    ]
    counts = Counter(roles)
    ensemble = " + ".join(
        f"{_display_role(role)} ×{count}" if count > 1 else _display_role(role)
        for role, count in counts.items()
    )

    return {
        "ensemble": ensemble,
        "archetypes": roles,
        "configuration_odds": selected["odds"],
        "matched_roles": _expand_roles(matched[0]["roles"]) if matched else [],
        "nearest_roles": _expand_roles(nearest["roles"]),
        "missing_roles": nearest["missing"] if not matched else [],
        "team_big5": team_big5,
        "trait_gaps": gaps,
        "analyzed_count": len(analyses),
    }


def _missing_roles(available: Counter[str], required: dict[str, int]) -> list[str]:
    missing: list[str] = []
    for role, count in required.items():
        missing.extend([role] * max(count - available[role], 0))
    return missing


def _expand_roles(roles: dict[str, int]) -> list[str]:
    return [role for role, count in roles.items() for _ in range(count)]


def _display_role(role: str) -> str:
    return "Developer" if role == "dev" else role.title()
