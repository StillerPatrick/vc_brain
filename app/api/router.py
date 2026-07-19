from fastapi import APIRouter

from app.api.routes import analysis, applications, data, jobs, metadata, scraping

api_router = APIRouter()
api_router.include_router(scraping.router, prefix="/scrape", tags=["scraping"])
api_router.include_router(data.router, prefix="/data", tags=["data"])
api_router.include_router(jobs.router, prefix="/jobs", tags=["jobs"])
api_router.include_router(analysis.router, prefix="/analysis", tags=["analysis"])
api_router.include_router(applications.router, prefix="/applications", tags=["applications"])
api_router.include_router(metadata.router, prefix="/metadata", tags=["metadata"])
