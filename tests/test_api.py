import uuid
from datetime import date

from app.api.routes import analysis
from app.api.routes import scraping
from app.schemas.analysis import PersonalityScores
from app.services import analysis_workflow, orchestrator
from app.services.github import GitHubService
from app.services.personality import AnalysisRun
from app.services.twitter import TwitterPlaywrightService


async def no_op_job(*args, **kwargs) -> None:
    return None


def test_health(client) -> None:
    response = client.get("/health")
    assert response.status_code == 200
    assert response.json() == {"status": "ok"}


def test_github_trigger_returns_job_and_status(client, monkeypatch) -> None:
    monkeypatch.setattr(scraping, "run_scrape_job", no_op_job)

    response = client.post("/api/v1/scrape/github", json={"handle": "octocat"})

    assert response.status_code == 202
    body = response.json()
    assert body["message"] == "Data scraping actively started and will be stored."
    assert body["status"] == "processing"
    uuid.UUID(body["job_id"])

    job_response = client.get(f"/api/v1/jobs/{body['job_id']}")
    assert job_response.status_code == 200
    job = job_response.json()
    assert job["status"] == "processing"
    assert job["platforms"] == ["github"]

    data_response = client.get(f"/api/v1/data/{job['user_id']}")
    assert data_response.status_code == 200
    assert data_response.json()["github"] == []


def test_scrape_all_response_contract(client, monkeypatch) -> None:
    monkeypatch.setattr(scraping, "run_scrape_job", no_op_job)
    response = client.post(
        "/api/v1/scrape/all",
        json={
            "github_handle": "octocat",
            "linkedin_url": "https://www.linkedin.com/in/example/",
            "twitter_handle": "example",
        },
    )

    assert response.status_code == 202
    assert set(response.json()) == {"message", "job_id", "status"}
    assert response.json()["status"] == "processing"


def test_background_job_persists_data_and_completes(client, monkeypatch) -> None:
    async def fake_github_scrape(self, handle: str):
        return {"profile": {"login": handle}, "repositories": []}

    monkeypatch.setattr(orchestrator.GitHubService, "scrape_user", fake_github_scrape)

    response = client.post("/api/v1/scrape/github", json={"handle": "octocat"})
    assert response.status_code == 202

    job = client.get(f"/api/v1/jobs/{response.json()['job_id']}").json()
    assert job["status"] == "completed"
    assert job["error"] is None

    data = client.get(f"/api/v1/data/{job['user_id']}/github").json()
    assert len(data) == 1
    assert data[0]["payload"]["profile"]["login"] == "octocat"


def test_missing_resources_return_404(client) -> None:
    missing_id = uuid.uuid4()
    assert client.get(f"/api/v1/jobs/{missing_id}").status_code == 404
    assert client.get(f"/api/v1/data/{missing_id}").status_code == 404


def test_invalid_linkedin_url_returns_422(client) -> None:
    response = client.post(
        "/api/v1/scrape/linkedin",
        json={"profile_url": "not-a-url"},
    )
    assert response.status_code == 422


def test_current_github_streak_includes_today() -> None:
    days = [
        {"date": "2026-07-16", "contributionCount": 0},
        {"date": "2026-07-17", "contributionCount": 2},
        {"date": "2026-07-18", "contributionCount": 1},
        {"date": "2026-07-19", "contributionCount": 3},
    ]

    assert GitHubService._calculate_current_streak(
        days, today=date(2026, 7, 19)
    ) == 3


def test_current_github_streak_allows_no_contribution_yet_today() -> None:
    days = [
        {"date": "2026-07-16", "contributionCount": 0},
        {"date": "2026-07-17", "contributionCount": 2},
        {"date": "2026-07-18", "contributionCount": 1},
        {"date": "2026-07-19", "contributionCount": 0},
    ]

    assert GitHubService._calculate_current_streak(
        days, today=date(2026, 7, 19)
    ) == 2


def test_twitter_status_url_parser() -> None:
    assert TwitterPlaywrightService._parse_status_href(
        "/karpathy/status/1234567890"
    ) == ("karpathy", "1234567890")
    assert TwitterPlaywrightService._parse_status_href("/karpathy") is None


def test_personality_analysis_is_compacted_and_persisted(client, monkeypatch) -> None:
    async def fake_github_scrape(self, handle: str):
        return {
            "profile": {
                "login": handle,
                "bio": "Machine learning engineer and speaker",
                "public_repos": 2,
                "followers_url": "must not reach OpenAI",
            },
            "repositories": [
                {
                    "name": "agent-harness",
                    "description": "A reliable agent harness",
                    "language": "Python",
                    "fork": False,
                    "stargazers_count": 3,
                    "forks_count": 1,
                }
            ],
            "current_streak": 4,
        }

    captured_evidence = None

    async def fake_analyze(self, evidence):
        nonlocal captured_evidence
        captured_evidence = evidence
        return AnalysisRun(
            scores=PersonalityScores(
                agreeableness=3.8,
                conscientiousness=4.5,
                extraversion=4.0,
                emotional_stability=3.2,
                openness=4.7,
                classification="engineer",
                confidence=0.72,
                summary="Curious, disciplined, and strongly reliability-minded.",
                rationale="Strong engineering and experimentation signals.",
            ),
            response_id="resp_test",
            input_tokens=321,
            output_tokens=87,
        )

    monkeypatch.setattr(orchestrator.GitHubService, "scrape_user", fake_github_scrape)
    monkeypatch.setattr(
        analysis_workflow.PersonalityAnalysisService, "analyze_evidence", fake_analyze
    )

    scrape_response = client.post(
        "/api/v1/scrape/github", json={"handle": "analysis-user"}
    )
    job = client.get(
        f"/api/v1/jobs/{scrape_response.json()['job_id']}"
    ).json()

    response = client.post(f"/api/v1/analysis/{job['user_id']}")

    assert response.status_code == 201
    body = response.json()
    assert body["classification"] == "engineer"
    assert body["conscientiousness"] == 4.5
    assert body["summary"] == "Curious, disciplined, and strongly reliability-minded."
    assert body["openai_response_id"] == "resp_test"
    assert body["input_tokens"] == 321
    assert captured_evidence["github"]["recent_owned_projects"][0] == {
        "name": "agent-harness",
        "description": "A reliable agent harness",
        "language": "Python",
        "stars": 3,
        "forks": 1,
    }
    assert "followers_url" not in str(captured_evidence)

    stored = client.get(f"/api/v1/analysis/{job['user_id']}").json()
    assert len(stored) == 1
    assert stored[0]["id"] == body["id"]


def test_application_pipeline_persists_team_categorization(client, monkeypatch) -> None:
    async def fake_github_scrape(self, handle: str):
        return {
            "profile": {"login": handle, "bio": "Builder", "public_repos": 1},
            "repositories": [],
            "current_streak": 2,
        }

    async def fake_analyze(self, evidence):
        is_leader = evidence["subject"]["display_name"] == "Ada Leader"
        return AnalysisRun(
            scores=PersonalityScores(
                agreeableness=3.5,
                conscientiousness=4.0,
                extraversion=4.4 if is_leader else 3.2,
                emotional_stability=3.0,
                openness=4.5,
                classification="leader" if is_leader else "dev",
                confidence=0.8,
                summary="Collaborative, focused, and consistently execution-oriented.",
                rationale="Evidence-based test analysis.",
            ),
            response_id="resp_application_test",
            input_tokens=200,
            output_tokens=60,
        )

    monkeypatch.setattr(orchestrator.GitHubService, "scrape_user", fake_github_scrape)
    monkeypatch.setattr(
        analysis_workflow.PersonalityAnalysisService, "analyze_evidence", fake_analyze
    )

    response = client.post(
        "/api/v1/applications",
        json={
            "company": "Team Test",
            "one_liner": "A test company",
            "sector": "Dev tools",
            "location": "Berlin, DE",
            "founders": [
                {
                    "name": "Ada Leader",
                    "role": "CEO",
                    "github": "https://github.com/ada-team-test",
                },
                {
                    "name": "Dev Builder",
                    "role": "CTO",
                    "github": "https://github.com/dev-team-test",
                },
            ],
        },
    )

    assert response.status_code == 202
    application_id = response.json()["application_id"]
    detail = client.get(f"/api/v1/applications/{application_id}").json()
    assert detail["status"] == "completed"
    assert len(detail["founders"]) == 2
    assert [founder["analysis"]["classification"] for founder in detail["founders"]] == [
        "leader",
        "dev",
    ]
    assert detail["team_categorization"]["ensemble"] == "Leader + Developer"
    assert detail["team_categorization"]["configuration_odds"] == 12.9
    assert detail["team_categorization"]["missing_roles"] == ["dev"]
