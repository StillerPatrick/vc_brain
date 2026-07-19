"""Derive compact CV fields from a HarvestAPI LinkedIn profile payload."""

from datetime import datetime, timezone
from typing import Any

_MONTHS = {
    "Jan": 1, "Feb": 2, "Mar": 3, "Apr": 4, "May": 5, "Jun": 6,
    "Jul": 7, "Aug": 8, "Sep": 9, "Oct": 10, "Nov": 11, "Dec": 12,
}

# ordered highest first; matched as substring of the degree text
_DEGREE_RANK = ["phd", "doctor", "master", "mba", "diplom", "bachelor"]


def _clean(value: Any, limit: int) -> str | None:
    if not value:
        return None
    text = " ".join(str(value).split())
    return text[:limit] or None


def _year_month(entry: Any) -> tuple[int, int] | None:
    if not isinstance(entry, dict):
        return None
    year = entry.get("year")
    if not isinstance(year, int):
        return None
    month = _MONTHS.get(str(entry.get("month") or "")[:3], 6)
    return year, month


def _years_experience(experience: list[dict[str, Any]]) -> float | None:
    # ponytail: total span earliest start → latest end (or now); overlaps and
    # gaps are not netted out — refine if the Founder Score needs it.
    starts: list[tuple[int, int]] = []
    ends: list[tuple[int, int]] = []
    present = False
    for entry in experience:
        start = _year_month(entry.get("startDate"))
        if start:
            starts.append(start)
        end_raw = entry.get("endDate") or {}
        if str(end_raw.get("text") or "").strip().lower() == "present":
            present = True
        else:
            end = _year_month(end_raw)
            if end:
                ends.append(end)
    if not starts:
        return None
    start_year, start_month = min(starts)
    if present or not ends:
        now = datetime.now(timezone.utc)
        end_year, end_month = now.year, now.month
    else:
        end_year, end_month = max(ends)
    months = (end_year - start_year) * 12 + (end_month - start_month)
    return round(max(0, months) / 12, 1)


def _compact_experience(entry: dict[str, Any]) -> dict[str, Any]:
    return {
        "position": _clean(entry.get("position"), 255),
        "company": _clean(entry.get("companyName"), 255),
        "employment_type": entry.get("employmentType"),
        "location": _clean(entry.get("location"), 255),
        "start": (entry.get("startDate") or {}).get("text"),
        "end": (entry.get("endDate") or {}).get("text"),
        "duration": entry.get("duration"),
        "description": _clean(entry.get("description"), 300),
    }


def _compact_education(entry: dict[str, Any]) -> dict[str, Any]:
    return {
        "school": _clean(entry.get("schoolName"), 255),
        "degree": _clean(entry.get("degree"), 255),
        "field": _clean(entry.get("fieldOfStudy"), 255),
        "period": entry.get("period"),
        "grade": _clean(entry.get("insights"), 100),
    }


def _highest_education(education: list[dict[str, Any]]) -> dict[str, Any] | None:
    def rank(entry: dict[str, Any]) -> int:
        degree = str(entry.get("degree") or "").lower()
        for index, keyword in enumerate(_DEGREE_RANK):
            if keyword in degree:
                return index
        return len(_DEGREE_RANK)

    return min(education, key=rank) if education else None


def derive_cv(payload: dict[str, Any]) -> dict[str, Any]:
    """Map a raw profile payload onto the User CV columns."""
    experience = [e for e in payload.get("experience") or [] if isinstance(e, dict)]
    education = [e for e in payload.get("education") or [] if isinstance(e, dict)]
    current_entries = [e for e in payload.get("currentPosition") or [] if isinstance(e, dict)]
    current = current_entries[0] if current_entries else None
    if current is None:
        current = next(
            (
                e
                for e in experience
                if str((e.get("endDate") or {}).get("text") or "").strip().lower()
                == "present"
            ),
            {},
        )
    location = payload.get("location") or {}
    top_education = _highest_education(education)
    skills = list(
        dict.fromkeys(
            [s for s in payload.get("topSkills") or [] if isinstance(s, str)]
            + [
                s.get("name")
                for s in payload.get("skills") or []
                if isinstance(s, dict) and s.get("name")
            ]
        )
    )[:15]
    return {
        "headline": _clean(payload.get("headline"), 512),
        "location_text": _clean(location.get("linkedinText"), 255),
        "country_code": location.get("countryCode"),
        "current_position": _clean(current.get("position"), 255),
        "current_company": _clean(current.get("companyName"), 255),
        "years_experience": _years_experience(experience),
        "highest_degree": _clean(top_education.get("degree"), 255) if top_education else None,
        "field_of_study": _clean(top_education.get("fieldOfStudy"), 255) if top_education else None,
        "experience": [_compact_experience(e) for e in experience[:10]],
        "education": [_compact_education(e) for e in education[:5]],
        "skills": skills,
        "connections_count": payload.get("connectionsCount"),
        "follower_count": payload.get("followerCount"),
    }
