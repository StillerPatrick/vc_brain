# Role
You are an expert Python backend developer specializing in FastAPI, asynchronous data processing, and external API orchestration.

# Task
Build a FastAPI backend that actively scrapes and stores user data from GitHub, LinkedIn, and X (Twitter). You will also generate a `README.md` with explicit deployment instructions.

# Tech Stack
*   **Framework:** FastAPI
*   **Server:** Uvicorn
*   **Database:** SQLAlchemy (async) with SQLite (default for development) or PostgreSQL.
*   **Scraping Tools:**
    *   Apify Python SDK (strictly for LinkedIn and X).
    *   `httpx` or `aiohttp` for GitHub (via standard GitHub REST API).
*   **Task Processing:** FastAPI `BackgroundTasks` (for non-blocking scrape triggers).

# System Architecture & Requirements

## 1. Database Schema
Design a relational database using SQLAlchemy models:
*   **ScrapeJob:** Tracks the complete scraping process. Fields: `id` (UUID, primary key), `status` (pending, processing, completed, failed), `created_at`.
*   **User:** Represents the target user being scraped.
*   **GitHubData**, **LinkedInData**, **TwitterData**: Tables linking back to the User/Job to store the extracted JSON payloads or structured fields.

## 2. Asynchronous Processing
*   Scraping LinkedIn and X via Apify takes time. Endpoints that trigger scraping must **not** block waiting for Apify to finish.
*   Trigger the Apify Actors and GitHub API calls via FastAPI `BackgroundTasks`.
*   The endpoints must immediately return a `202 Accepted` response with the primary key (Job ID) so the client knows the data is actively being processed and stored.

## 3. Required API Endpoints

### Scraping Triggers
*   `POST /api/v1/scrape/github` - Triggers a background job to fetch GitHub data for a provided handle.
*   `POST /api/v1/scrape/linkedin` - Triggers an Apify actor for LinkedIn.
*   `POST /api/v1/scrape/twitter` - Triggers an Apify actor for X (Twitter).
*   `POST /api/v1/scrape/all` - Starts the complete orchestration process across all three platforms concurrently.
    *   **Required Response:**
        ```json
        {
          "message": "Data scraping actively started and will be stored.",
          "job_id": "<UUID key primary>",
          "status": "processing"
        }
        ```

### Data Retrieval
*   `GET /api/v1/data/{user_id}` - Retrieves all aggregated data (GitHub, LinkedIn, Twitter) for a specific user.
*   `GET /api/v1/data/{user_id}/github` - Retrieves only the GitHub data.
*   `GET /api/v1/data/{user_id}/linkedin` - Retrieves only the LinkedIn data.
*   `GET /api/v1/data/{user_id}/twitter` - Retrieves only the Twitter data.
*   `GET /api/v1/jobs/{job_id}` - Checks the completion status of a specific scrape job.

## 4. Third-Party Integrations
*   **Apify:** Abstract the Apify client calls into a dedicated service layer. Use standard community actors for Twitter and LinkedIn profile scraping unless specific actor IDs are provided.
*   **GitHub:** Use the official public GitHub API. Ensure rate limit handling is implemented.

# Deliverables
1.  **FastAPI Application Code:** Fully functional, structured into routes, database, schemas (Pydantic), and services.
2.  **`requirements.txt` or `pyproject.toml`:** Containing all necessary dependencies.
3.  **`README.md`:** Must include:
    *   Environment variable setup (Apify tokens, GitHub tokens, DB URLs).
    *   Local execution instructions (`uvicorn main:app --reload`).
    *   Deployment instructions (provide a `Dockerfile` and `docker-compose.yml` for easy containerized deployment).

# Constraints
*   Write modular, clean code. Do not put everything in `main.py`.
*   Use Pydantic V2 for all request/response models.
*   Implement standard error handling and HTTP exceptions (e.g., 404 for missing data, 500 for Apify failures).

# Current Implementation Handoff

## Application and Pitch-Deck Flow
*   The Next.js application form is implemented in `app/apply/page.tsx`.
*   The pitch-deck chooser accepts PDF files only and keeps the selected `File`, not just its filename.
*   Submission is a two-step operation:
    1. `POST /api/v1/applications` creates the startup application and starts founder diligence.
    2. `POST /api/v1/metadata/{application_id}` uploads and stores the PDF, then starts metadata extraction with `BackgroundTasks`.
*   Keep these operations non-blocking. PDF storage completes before the metadata endpoint returns `202`; rendering and OpenAI extraction run afterward.

## Startup Metadata API
The metadata router is in `app/api/routes/metadata.py` and exposes:
*   `POST /api/v1/metadata/{application_id}` - Upload or replace a pitch-deck PDF; maximum size defaults to 20 MB.
*   `GET /api/v1/metadata/{application_id}` - Retrieve extraction status and structured startup metadata.
*   `GET /api/v1/metadata/{application_id}/deck` - Stream the stored PDF.
*   `GET /api/v1/metadata/{application_id}/first-slide` - Stream the generated PNG preview.

Uploads must have a `.pdf` filename, an accepted PDF content type, and a PDF signature within the first 1,024 bytes. Re-uploading replaces the stored deck and resets extraction state.

## OpenAI Extraction
*   `app/services/startup_metadata.py` sends the complete PDF to the OpenAI Responses API as an `input_file`.
*   Structured output uses the Pydantic model `ExtractedStartupMetadata` from `app/schemas/metadata.py`.
*   Output consists of the deck-derived company name and exactly three factual summary sentences.
*   Deck text is treated as untrusted data and must never override the system extraction instructions.
*   The service uses `OPENAI_MODEL` (currently defaulting to `gpt-5.6-terra`), `OPENAI_API_KEY`, and `OPENAI_TIMEOUT_SECONDS`.
*   Do not silently fall back to applicant-entered values when extraction fails. Persist `failed` status and the error instead.

## PDF Preview and Storage
*   PyMuPDF renders the first page at 2x scale as PNG.
*   The `startup_metadata` table stores the original PDF and preview as binary columns so both SQLite and PostgreSQL deployments retain the assets.
*   `StartupMetadata` is a one-to-one child of `StartupApplication` and is deleted with its application.
*   The table also stores status, extracted values, OpenAI response/model/token metadata, errors, and timestamps.
*   SQLAlchemy `Base.metadata.create_all` performs the current idempotent schema migration during FastAPI startup. The active development SQLite database has already been migrated.

## Frontend Company Data Area
*   `StartupApplicationResponse` includes optional nested `metadata`.
*   `lib/api.ts` contains the metadata types, multipart upload helper, and asset URL helper.
*   `app/live-application.tsx` renders a Company Data section containing extraction status, company name, the three-sentence summary, first-slide preview, and a link to the stored PDF.
*   Investor-console polling refreshes live applications every five seconds, so processing metadata appears when complete.

## Configuration and Dependencies
*   `MAX_PITCH_DECK_BYTES` controls upload size and defaults to `20971520` bytes.
*   Required PDF dependencies are `python-multipart` and `pymupdf` in `requirements.txt`.
*   The OpenAI developer-docs MCP server is configured globally as `openaiDeveloperDocs`; restart Codex before expecting it to be available in a new tool session.

## Verification
Run these checks after related changes:

```bash
python -m pytest -q
npm run lint
npm run build
git diff --check
```

Pitch-deck endpoint, storage, preview, and validation coverage is in `tests/test_metadata.py`. The current baseline is 14 passing backend tests and a successful Next.js production build.
