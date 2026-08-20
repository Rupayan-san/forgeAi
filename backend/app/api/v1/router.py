from fastapi import APIRouter
from app.api.v1.endpoints import auth, projects, chat, decisions, group_chat

api_router = APIRouter()

# Auth routes
api_router.include_router(auth.router, prefix="/auth", tags=["auth"])

# Project routes
api_router.include_router(projects.router, prefix="/projects", tags=["projects"])

# Group chat routes (nested under /projects)
api_router.include_router(group_chat.router, prefix="/projects", tags=["group-chat"])

# Chat routes (nested under /projects)
api_router.include_router(chat.router, prefix="/projects", tags=["chat"])

# Decisions routes (nested under /projects)
api_router.include_router(decisions.router, prefix="/projects", tags=["decisions"])


@api_router.get("/health")
async def health_check():
    """API health check endpoint."""
    return {"status": "healthy", "service": "forge-api", "version": "0.1.0"}
