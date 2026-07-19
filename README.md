# VC Brain Scraper API

A FastAPI and Next.js application that starts non-blocking collection jobs for
GitHub, LinkedIn, and X, stores the collected data, analyzes founder profiles,
and categorizes founding teams.

## What it does

- Returns `202 Accepted` as soon as a scrape job has been persisted.
- Runs GitHub, LinkedIn, and X concurrently for `/api/v1/scrape/all`.
- Uses the official GitHub REST and GraphQL APIs, including the current
  contribution streak, with REST rate-limit detection and a bounded retry.
- Uses Apify for LinkedIn and an async Playwright/Chromium browser for X.
- Reuses the provided LinkedIn posts actor, `harvestapi/linkedin-profile-posts`, and
  its `targetUrls`, post, comment, reaction, and repost options.
- Keeps platform results linked to both a user and a scrape job.
- Uses the OpenAI Responses API with structured output to score five observable
  professional-persona traits and persist a primary work-style classification.
- Sends a compact evidence digest instead of raw provider payloads and records
  input/output token usage with every analysis.
- Accepts 1–3-founder startup applications, runs founder diligence concurrently,
  and stores the resulting team ensemble, configuration match, and trait gaps.
- Records partial results and marks a job `failed` with an error if any provider fails.

Interactive API documentation is available at `/docs` after startup.

## Local setup

Python 3.11 or newer is recommended.

```bash
python -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
python -m playwright install chromium
cp .env.example .env
```

Edit `.env`:

```dotenv
# SQLite is the development default.
DATABASE_URL=sqlite+aiosqlite:///./vc_brain.db

# Optional for public profile/repository data. Required to collect the current
# GitHub contribution streak.
GITHUB_TOKEN=github_pat_your_token

# Required for LinkedIn jobs.
APIFY_API_TOKEN=apify_api_your_token

LINKEDIN_ACTOR_ID=harvestapi/linkedin-profile-posts

# Optional but recommended: copy the auth_token cookie from an authenticated
# X browser session. Treat it like a password.
X_AUTH_TOKEN=

# Required for POST /api/v1/analysis/{user_id}. The model is configurable.
OPENAI_API_KEY=openai_api_key
OPENAI_MODEL=gpt-5.6-terra
```

Start the backend and frontend together from the repository root:

```bash
npm ci
npm run dev:stack
```

Alternatively, run them in separate terminals:

```bash
uvicorn main:app --reload
# second terminal
npm run dev
```

The investor console is available at `http://localhost:3000`; it polls live
applications through a same-origin `/backend` proxy to FastAPI. Override the
proxy target with `BACKEND_URL` when FastAPI is not running on port 8000.

Run the Chromium application test (this submits a real application and starts
the configured external scraping jobs):

```bash
npx playwright install chromium
npm run test:e2e
```

Tables and the local `vc_brain.db` file are created automatically during
application startup. Check the service:

```bash
curl http://localhost:8000/health
```

## API examples

Start all three scrapers:

```bash
curl -X POST http://localhost:8000/api/v1/scrape/all \
  -H 'Content-Type: application/json' \
  -d '{
    "display_name": "Example Person",
    "github_handle": "octocat",
    "linkedin_url": "https://www.linkedin.com/in/example/",
    "twitter_handle": "example",
    "linkedin_max_posts": 10,
    "twitter_max_items": 20
  }'
```

The immediate response is:

```json
{
  "message": "Data scraping actively started and will be stored.",
  "job_id": "a UUID",
  "status": "processing"
}
```

Poll the job. This response also supplies the `user_id` needed by data endpoints:

```bash
curl http://localhost:8000/api/v1/jobs/JOB_ID
curl http://localhost:8000/api/v1/data/USER_ID
curl http://localhost:8000/api/v1/data/USER_ID/linkedin
```

Individual triggers accept `user_id` to append a new scrape to an existing user:

```bash
curl -X POST http://localhost:8000/api/v1/scrape/github \
  -H 'Content-Type: application/json' \
  -d '{"handle":"octocat","user_id":"USER_UUID"}'
```

Create and retrieve personality analyses after scraping at least one platform:

```bash
curl -X POST http://localhost:8000/api/v1/analysis/USER_UUID
curl http://localhost:8000/api/v1/analysis/USER_UUID
```

The analysis stores 0–5 scores for agreeableness, conscientiousness,
extraversion, emotional stability, and openness, plus one classification from
`accomplisher`, `leader`, `dev`, `engineer`, `fighter`, or `operator`.

Submit a team application. This immediately returns `202 Accepted`; poll the
returned application ID while founder scraping and analysis run in the background:

```bash
curl -X POST http://localhost:8000/api/v1/applications \
  -H 'Content-Type: application/json' \
  -d '{
    "company": "Example Labs",
    "one_liner": "Agent infrastructure for support teams",
    "sector": "AI infra",
    "location": "Berlin, DE",
    "founders": [{
      "name": "Example Founder",
      "role": "CEO",
      "github": "https://github.com/example",
      "linkedin": "https://www.linkedin.com/in/example/",
      "x": "https://x.com/example"
    }]
  }'

curl http://localhost:8000/api/v1/applications/APPLICATION_ID
curl http://localhost:8000/api/v1/applications
```

Upload and analyze a pitch deck after creating the application. The PDF is stored
in the application database immediately; first-slide rendering and structured
OpenAI extraction run in the background:

```bash
curl -X POST http://localhost:8000/api/v1/metadata/APPLICATION_ID \
  -F 'deck=@pitch-deck.pdf;type=application/pdf'

curl http://localhost:8000/api/v1/metadata/APPLICATION_ID
curl http://localhost:8000/api/v1/metadata/APPLICATION_ID/deck --output pitch-deck.pdf
curl http://localhost:8000/api/v1/metadata/APPLICATION_ID/first-slide --output first-slide.png
```

The upload endpoint accepts PDF files up to 20 MB and returns `202 Accepted`.
The metadata response moves from `processing` to `completed` or `failed`, and
contains the deck-derived company name and exactly three summary sentences.
The `startup_metadata` table is created idempotently during application startup,
so existing SQLite and PostgreSQL databases are migrated without deleting data.

## Docker deployment

Docker Compose starts the frontend and API, with a persistent SQLite database.
Export secrets in the shell (or put them in a local `.env`, which is ignored by Git):

```bash
export APIFY_API_TOKEN=apify_api_your_token
export GITHUB_TOKEN=github_pat_your_token
export X_AUTH_TOKEN=your_x_auth_token_cookie
export OPENAI_API_KEY=openai_api_key
docker compose up --build -d
docker compose logs -f api
```

The frontend is exposed on `http://localhost:3000` and the API on
`http://localhost:8000`. Stop both with:

```bash
docker compose down
```

Database data remains in the `sqlite_data` Docker volume. To deploy the image on
another container platform, build and push it, supply the same environment
variables, expose port `8000`, and mount persistent storage at `/data`:

```bash
docker build -t your-registry/vc-brain:latest .
docker push your-registry/vc-brain:latest
```

Run one Uvicorn worker for this prototype. `BackgroundTasks` runs inside the API
process, so an in-flight scrape is not durable across restarts and multiple worker
processes do not share a task queue. A production version that must guarantee job
execution should replace it with Celery, Dramatiq, or another durable queue.

## Tests

Tests mock background execution, so they do not call external services:

```bash
pytest -q
```

## Project layout

```text
app/
  *.tsx             Next.js investor console and application UI
  api/routes/       API endpoints
  core/             environment settings
  db/               async engine and sessions
  models/           SQLAlchemy entities
  schemas/          Pydantic v2 contracts
  services/         GitHub, LinkedIn/Apify, X/Playwright, and orchestration
main.py             Uvicorn entry point
lib/                Frontend data and typed API client
```
