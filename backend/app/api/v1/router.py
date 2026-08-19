from fastapi import APIRouter
from app.api.v1.endpoints import auth, projects

api_router = APIRouter()

# Auth routes
api_router.include_router(auth.router, prefix="/auth", tags=["auth"])

# Project routes
api_router.include_router(projects.router, prefix="/projects", tags=["projects"])


@api_router.get("/health")
async def health_check():
    """API health check endpoint."""
    return {"status": "healthy", "service": "forge-api", "version": "0.1.0"}
