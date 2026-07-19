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
