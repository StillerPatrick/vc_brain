from typing import Any

from apify_client import ApifyClientAsync

from app.core.config import settings
from app.services.exceptions import IntegrationError


class ApifyService:
    def __init__(self) -> None:
        if not settings.apify_api_token:
            raise IntegrationError("APIFY_API_TOKEN is not configured")
        self.client = ApifyClientAsync(settings.apify_api_token)

    async def scrape_linkedin_posts(
        self,
        profile_url: str,
        *,
        max_posts: int = 10,
        include_reposts: bool = False,
        max_comments: int = 10,
        max_reactions: int = 10,
    ) -> list[dict[str, Any]]:
        # This mirrors the input in the repository's apify_scraper.py example.
        run_input = {
            "targetUrls": [profile_url],
            "maxPosts": max_posts,
            "includeReposts": include_reposts,
            "maxComments": max_comments,
            "postNestedComments": True,
            "maxReactions": max_reactions,
            "postNestedReactions": True,
        }
        # HarvestAPI's posts actor creates named storages, which the default
        # limited-permission sandbox forbids — it needs full permissions plus a
        # one-time approval in the Apify console.
        items = await self._run_actor(
            settings.linkedin_actor_id,
            run_input,
            permission_level="FULL_PERMISSIONS",
        )
        return [item for item in items if include_reposts or not item.get("repostedBy")]

    async def scrape_linkedin_profile(self, profile_url: str) -> dict[str, Any]:
        """Fetch full profile details (experience, education, skills, …)."""
        items = await self._run_actor(
            settings.linkedin_profile_actor_id,
            {"startUrls": [{"url": profile_url}]},
        )
        return items[0]

    async def _run_actor(
        self,
        actor_id: str,
        run_input: dict[str, Any],
        *,
        permission_level: str | None = None,
    ) -> list[dict[str, Any]]:
        try:
            run = await self.client.actor(actor_id).call(
                run_input=run_input,
                force_permission_level=permission_level,
            )
        except Exception as exc:
            raise IntegrationError(f"Apify actor {actor_id!r} failed: {exc}") from exc

        if run is None:
            raise IntegrationError(f"Apify actor {actor_id!r} did not finish successfully")

        dataset_id = self._value(run, "defaultDatasetId", "default_dataset_id")
        if not dataset_id:
            raise IntegrationError(f"Apify actor {actor_id!r} returned no dataset")

        try:
            items = [
                item async for item in self.client.dataset(str(dataset_id)).iterate_items()
            ]
        except Exception as exc:
            raise IntegrationError(f"Could not read Apify dataset {dataset_id}: {exc}") from exc

        if not items:
            raise IntegrationError(f"Apify actor {actor_id!r} returned an empty dataset")
        return items

    @staticmethod
    def _value(run: Any, mapping_key: str, attribute: str) -> Any:
        if isinstance(run, dict):
            return run.get(mapping_key)
        return getattr(run, attribute, None)
