from typing import Any
from urllib.parse import quote, urlparse

from playwright.async_api import (
    Error as PlaywrightError,
    Locator,
    TimeoutError as PlaywrightTimeoutError,
    async_playwright,
)

from app.core.config import settings
from app.services.exceptions import IntegrationError


class TwitterPlaywrightService:
    async def scrape_user(self, handle: str, *, max_items: int = 20) -> list[dict[str, Any]]:
        profile_url = f"{settings.x_base_url.rstrip('/')}/{quote(handle, safe='')}"
        try:
            async with async_playwright() as playwright:
                browser = await playwright.chromium.launch(
                    headless=True,
                    args=["--disable-dev-shm-usage"],
                )
                try:
                    context = await browser.new_context(
                        locale="en-US",
                        viewport={"width": 1440, "height": 1200},
                    )
                    if settings.x_auth_token:
                        await context.add_cookies(
                            [
                                {
                                    "name": "auth_token",
                                    "value": settings.x_auth_token,
                                    "domain": ".x.com",
                                    "path": "/",
                                    "httpOnly": True,
                                    "secure": True,
                                    "sameSite": "Lax",
                                }
                            ]
                        )

                    page = await context.new_page()
                    await page.goto(
                        profile_url,
                        wait_until="domcontentloaded",
                        timeout=settings.x_page_timeout_ms,
                    )
                    try:
                        await page.locator('article[data-testid="tweet"]').first.wait_for(
                            state="visible", timeout=settings.x_page_timeout_ms
                        )
                    except PlaywrightTimeoutError as exc:
                        body_text = (await page.locator("body").inner_text()).lower()
                        if "log in" in body_text or "sign in" in body_text:
                            raise IntegrationError(
                                "X requires authentication; configure X_AUTH_TOKEN"
                            ) from exc
                        raise IntegrationError(
                            f"No public posts were visible for @{handle}"
                        ) from exc

                    return await self._collect_tweets(page, max_items=max_items)
                finally:
                    await browser.close()
        except IntegrationError:
            raise
        except PlaywrightError as exc:
            raise IntegrationError(f"Playwright X scrape failed: {exc}") from exc

    async def _collect_tweets(self, page: Any, *, max_items: int) -> list[dict[str, Any]]:
        tweets: dict[str, dict[str, Any]] = {}
        unchanged_scrolls = 0

        for _ in range(settings.x_max_scrolls + 1):
            previous_count = len(tweets)
            articles = page.locator('article[data-testid="tweet"]')
            for index in range(await articles.count()):
                tweet = await self._extract_tweet(articles.nth(index))
                if tweet is not None:
                    tweets[tweet["id"]] = tweet
                    if len(tweets) >= max_items:
                        return self._newest(tweets, max_items=max_items)

            await page.mouse.wheel(0, 3_000)
            await page.wait_for_timeout(1_000)
            unchanged_scrolls = unchanged_scrolls + 1 if len(tweets) == previous_count else 0
            if unchanged_scrolls >= 3:
                break

        if not tweets:
            raise IntegrationError("X returned no parseable posts")
        return self._newest(tweets, max_items=max_items)

    @staticmethod
    def _newest(
        tweets: dict[str, dict[str, Any]], *, max_items: int
    ) -> list[dict[str, Any]]:
        return sorted(
            tweets.values(),
            key=lambda tweet: tweet.get("published_at") or "",
            reverse=True,
        )[:max_items]

    async def _extract_tweet(self, article: Locator) -> dict[str, Any] | None:
        time_locator = article.locator("time").first
        if await time_locator.count() == 0:
            return None

        status_href = await time_locator.locator("xpath=..").get_attribute("href")
        status = self._parse_status_href(status_href)
        if status is None:
            return None
        author_handle, tweet_id = status

        text_parts = await article.locator('[data-testid="tweetText"]').all_inner_texts()
        published_at = await time_locator.get_attribute("datetime")
        profile_name_parts = await article.locator('[data-testid="User-Name"]').all_inner_texts()

        return {
            "id": tweet_id,
            "url": f"{settings.x_base_url.rstrip('/')}/{author_handle}/status/{tweet_id}",
            "author_handle": author_handle,
            "author_display_name": profile_name_parts[0].split("\n")[0]
            if profile_name_parts
            else None,
            "text": "\n".join(text_parts),
            "published_at": published_at,
            "is_pinned": "Pinned" in (await article.inner_text()),
            "metrics": {
                name: await self._aria_label(article, selector)
                for name, selector in {
                    "replies": '[data-testid="reply"]',
                    "reposts": '[data-testid="retweet"]',
                    "likes": '[data-testid="like"]',
                }.items()
            },
            "images": await article.locator(
                '[data-testid="tweetPhoto"] img'
            ).evaluate_all("elements => elements.map(element => element.src)"),
        }

    @staticmethod
    async def _aria_label(article: Locator, selector: str) -> str | None:
        locator = article.locator(selector).first
        if await locator.count() == 0:
            return None
        return await locator.get_attribute("aria-label")

    @staticmethod
    def _parse_status_href(href: str | None) -> tuple[str, str] | None:
        if not href:
            return None
        path_parts = urlparse(href).path.strip("/").split("/")
        if len(path_parts) < 3 or path_parts[1] != "status":
            return None
        return path_parts[0], path_parts[2]
