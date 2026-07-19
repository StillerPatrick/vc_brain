"""Derive compact CV fields from an anchor/linkedin-profile-enrichment payload."""

from datetime import datetime, timezone
from typing import Any

# ordered highest first; matched as substring of the degree text
_DEGREE_RANK = ["phd", "doctor", "master", "mba", "diplom", "bachelor"]


def _clean(value: Any, limit: int) -> str | None:
    if not value:
        return None
    text = " ".join(str(value).split())
    return text[:limit] or None


def _int_year(value: Any) -> int | None:
    try:
        return int(str(value)[:4])
    except (TypeError, ValueError):
        return None


def _years_experience(experiences: list[dict[str, Any]]) -> float | None:
    # ponytail: span earliest start → latest end (or now when a role is still
    # running); overlaps and gaps are not netted out
    starts = [year for e in experiences if (year := _int_year(e.get("starts_at")))]
    if not starts:
        return None
    present = any(not e.get("ends_at") for e in experiences)
    ends = [year for e in experiences if (year := _int_year(e.get("ends_at")))]
    end = datetime.now(timezone.utc).year if present or not ends else max(ends)
    return float(max(0, end - min(starts)))


def _highest_education(education: list[dict[str, Any]]) -> dict[str, Any] | None:
    def rank(entry: dict[str, Any]) -> int:
        degree = str(entry.get("degree_name") or "").lower()
        for index, keyword in enumerate(_DEGREE_RANK):
            if keyword in degree:
                return index
        return len(_DEGREE_RANK)

    return min(education, key=rank) if education else None


def derive_cv(payload: dict[str, Any]) -> dict[str, Any]:
    """Map a raw profile payload onto the User CV columns."""
    experiences = [e for e in payload.get("experiences") or [] if isinstance(e, dict)]
    education = [e for e in payload.get("education") or [] if isinstance(e, dict)]
    current = next((e for e in experiences if not e.get("ends_at")), None)
    top_education = _highest_education(education)
    location_text = ", ".join(
        part for part in (payload.get("city"), payload.get("country")) if part
    )
    return {
        "headline": _clean(payload.get("headline"), 512),
        "location_text": _clean(location_text, 255),
        "country_code": None,
        "current_position": _clean(current.get("title") if current else None, 255),
        "current_company": _clean(
            (current.get("company") if current else None) or payload.get("company_name"),
            255,
        ),
        "years_experience": _years_experience(experiences),
        "highest_degree": _clean(top_education.get("degree_name"), 255)
        if top_education
        else None,
        "field_of_study": _clean(top_education.get("field_of_study"), 255)
        if top_education
        else None,
        "experience": [
            {
                "position": _clean(e.get("title"), 255),
                "company": _clean(e.get("company"), 255),
                "employment_type": None,
                "location": None,
                "start": e.get("starts_at"),
                "end": e.get("ends_at") or "Present",
                "duration": None,
                "description": _clean(e.get("description"), 300),
            }
            for e in experiences[:10]
        ],
        "education": [
            {
                "school": _clean(e.get("school"), 255),
                "degree": _clean(e.get("degree_name"), 255),
                "field": _clean(e.get("field_of_study"), 255),
                "period": " – ".join(
                    str(part) for part in (e.get("starts_at"), e.get("ends_at")) if part
                )
                or None,
                "grade": None,
            }
            for e in education[:5]
        ],
        "skills": [s for s in payload.get("skills") or [] if isinstance(s, str)][:15],
        "connections_count": None,
        "follower_count": payload.get("follower_count"),
    }
