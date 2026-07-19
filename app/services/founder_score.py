"""Transparent, standalone founder score.

The score intentionally measures only the individual public footprint.  It
does not infer a startup's quality or a founder's commitment to a particular
company, so it remains valid before an application or pitch deck exists.
"""

from typing import Any

from app.models.entities import PersonalityAnalysis
from app.services.team import TRAIT_BENCHMARKS


def calculate_founder_score(
    analysis: PersonalityAnalysis,
) -> tuple[int, dict[str, dict[str, Any]]]:
    """Return a 0–100 score and its auditable weighted components.

    Benchmark fit carries most of the weight.  Confidence and source breadth
    constrain the result when the public evidence is thin; neither evaluates
    pedigree, funding history, or an employer's brand.
    """
    benchmark_fit = 100 - (
        sum(
            abs(getattr(analysis, trait) * 20 - benchmark)
            for trait, benchmark in TRAIT_BENCHMARKS.items()
        )
        / len(TRAIT_BENCHMARKS)
    )
    source_summary = analysis.source_summary or {}
    # LinkedIn posts and profile count as one platform, rather than allowing
    # one scrape to inflate coverage.
    linkedin_present = bool(
        source_summary.get("linkedin_snapshots", 0)
        or source_summary.get("linkedin_profile_snapshots", 0)
    )
    platforms = sum(
        (
            bool(source_summary.get("github_snapshots", 0)),
            linkedin_present,
            bool(source_summary.get("twitter_snapshots", 0)),
        )
    )
    coverage = round(platforms / 3 * 100)
    confidence = round(analysis.confidence * 100)
    score = round(benchmark_fit * 0.70 + confidence * 0.20 + coverage * 0.10)
    components = {
        "benchmark_fit": {
            "label": "Founder benchmark fit",
            "score": round(max(0, min(100, benchmark_fit))),
            "weight": 0.70,
            "explanation": "Proximity of the observed Big Five profile to the successful-founder benchmark.",
        },
        "evidence_confidence": {
            "label": "Evidence confidence",
            "score": confidence,
            "weight": 0.20,
            "explanation": "Confidence in the analysis based on the specificity and consistency of public evidence.",
        },
        "research_coverage": {
            "label": "Research coverage",
            "score": coverage,
            "weight": 0.10,
            "explanation": f"Public evidence retrieved from {platforms} of 3 profile types.",
        },
    }
    return max(0, min(100, score)), components


def ensure_founder_score(analysis: PersonalityAnalysis) -> bool:
    """Populate a missing score and return whether the record changed."""
    if analysis.founder_score is not None and analysis.founder_score_components:
        return False
    analysis.founder_score, analysis.founder_score_components = calculate_founder_score(
        analysis
    )
    return True
