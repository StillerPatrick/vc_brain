import asyncio
import time
from datetime import date, datetime, time as datetime_time, timedelta, timezone
from typing import Any
from urllib.parse import quote

import httpx

from app.core.config import settings
from app.services.exceptions import IntegrationError, IntegrationNotFoundError


class GitHubService:
    def __init__(self) -> None:
        self.base_url = settings.github_api_url.rstrip("/")
        self.headers = {
            "Accept": "application/vnd.github+json",
            "X-GitHub-Api-Version": "2022-11-28",
            "User-Agent": "vc-brain-scraper",
        }
        if settings.github_token:
            self.headers["Authorization"] = f"Bearer {settings.github_token}"

    async def scrape_user(self, handle: str) -> dict[str, Any]:
        safe_handle = quote(handle, safe="")
        async with httpx.AsyncClient(headers=self.headers, timeout=30.0) as client:
            requests = [
                self._get(client, f"/users/{safe_handle}"),
                self._get(
                    client,
                    f"/users/{safe_handle}/repos",
                    params={"per_page": 100, "sort": "updated", "direction": "desc"},
                ),
            ]
            if settings.github_token:
                requests.append(self._get_contribution_streak(client, handle))

            results = await asyncio.gather(*requests)

        profile, repositories = results[:2]
        streak = results[2] if len(results) == 3 else None
        return {
            "profile": profile,
            "repositories": repositories,
            "current_streak": streak,
            "current_streak_as_of": datetime.now(timezone.utc).date().isoformat(),
        }

    async def _get_contribution_streak(
        self, client: httpx.AsyncClient, handle: str
    ) -> int:
        today = datetime.now(timezone.utc).date()
        period_start = today - timedelta(days=366)
        query = """
        query ContributionCalendar($login: String!, $from: DateTime!, $to: DateTime!) {
          user(login: $login) {
            contributionsCollection(from: $from, to: $to) {
              contributionCalendar {
                weeks {
                  contributionDays {
                    date
                    contributionCount
                  }
                }
              }
            }
          }
        }
        """
        variables = {
            "login": handle,
            "from": datetime.combine(
                period_start, datetime_time.min, tzinfo=timezone.utc
            ).isoformat(),
            "to": datetime.combine(
                today, datetime_time.max, tzinfo=timezone.utc
            ).isoformat(),
        }
        try:
            response = await client.post(
                settings.github_graphql_url,
                json={"query": query, "variables": variables},
            )
            response.raise_for_status()
            body = response.json()
        except (httpx.RequestError, httpx.HTTPStatusError, ValueError) as exc:
            raise IntegrationError(f"GitHub contribution request failed: {exc}") from exc

        if body.get("errors"):
            message = body["errors"][0].get("message", "unknown GraphQL error")
            raise IntegrationError(f"GitHub contribution request failed: {message}")

        try:
            weeks = body["data"]["user"]["contributionsCollection"][
                "contributionCalendar"
            ]["weeks"]
            contribution_days = [
                contribution_day
                for week in weeks
                for contribution_day in week["contributionDays"]
            ]
        except (KeyError, TypeError) as exc:
            raise IntegrationError("GitHub returned an invalid contribution calendar") from exc

        return self._calculate_current_streak(contribution_days, today=today)

    @staticmethod
    def _calculate_current_streak(
        contribution_days: list[dict[str, Any]], *, today: date
    ) -> int:
        counts = {
            date.fromisoformat(day["date"]): int(day["contributionCount"])
            for day in contribution_days
        }
        cursor = today
        if counts.get(cursor, 0) == 0:
            cursor -= timedelta(days=1)

        streak = 0
        while counts.get(cursor, 0) > 0:
            streak += 1
            cursor -= timedelta(days=1)
        return streak

    async def _get(
        self,
        client: httpx.AsyncClient,
        path: str,
        params: dict[str, Any] | None = None,
    ) -> Any:
        for attempt in range(2):
            try:
                response = await client.get(f"{self.base_url}{path}", params=params)
            except httpx.RequestError as exc:
                raise IntegrationError(f"GitHub request failed: {exc}") from exc

            if response.status_code == 404:
                raise IntegrationNotFoundError("GitHub user was not found")

            is_rate_limited = response.status_code == 429 or (
                response.status_code == 403
                and response.headers.get("X-RateLimit-Remaining") == "0"
            )
            if is_rate_limited:
                wait_seconds = self._rate_limit_wait(response)
                if attempt == 0 and wait_seconds <= settings.github_rate_limit_max_wait_seconds:
                    await asyncio.sleep(wait_seconds)
                    continue
                reset = response.headers.get("X-RateLimit-Reset", "unknown")
                raise IntegrationError(
                    f"GitHub API rate limit exceeded; reset timestamp: {reset}"
                )

            try:
                response.raise_for_status()
            except httpx.HTTPStatusError as exc:
                raise IntegrationError(
                    f"GitHub returned HTTP {response.status_code}: {response.text[:300]}"
                ) from exc
            return response.json()

        raise IntegrationError("GitHub request exhausted its retry attempts")

    @staticmethod
    def _rate_limit_wait(response: httpx.Response) -> float:
        retry_after = response.headers.get("Retry-After")
        if retry_after:
            try:
                return max(float(retry_after), 0.0)
            except ValueError:
                pass
        try:
            reset_at = float(response.headers.get("X-RateLimit-Reset", "0"))
        except ValueError:
            return 1.0
        return max(reset_at - time.time(), 1.0)
