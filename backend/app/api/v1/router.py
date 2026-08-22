from fastapi import APIRouter
from app.api.v1.endpoints import (
    auth,
    projects,
    constitution,
    chat,
    decisions,
    memory,
    group_chat,
    graph,
    architecture,
    meetings,
    intelligence,
)

api_router = APIRouter()

# Auth routes
api_router.include_router(auth.router, prefix="/auth", tags=["auth"])

# Project routes
api_router.include_router(projects.router, prefix="/projects", tags=["projects"])

# Constitution routes (nested under /projects)
api_router.include_router(constitution.router, prefix="/projects", tags=["constitution"])

# Group chat routes (nested under /projects)
api_router.include_router(group_chat.router, prefix="/projects", tags=["group-chat"])

# Chat routes (nested under /projects)
api_router.include_router(chat.router, prefix="/projects", tags=["chat"])

# Decisions routes (nested under /projects)
api_router.include_router(decisions.router, prefix="/projects", tags=["decisions"])

# Memory routes (nested under /projects)
api_router.include_router(memory.router, prefix="/projects", tags=["memory"])

# Graph routes (nested under /projects)
api_router.include_router(graph.router, prefix="/projects", tags=["graph"])

# System architecture routes
api_router.include_router(architecture.router, prefix="/system", tags=["architecture"])

# Meetings and Voice routes
api_router.include_router(meetings.router, tags=["meetings"])

# Project Intelligence routes
api_router.include_router(intelligence.router, tags=["intelligence"])


@api_router.get("/health")
async def health_check():
    """API health check endpoint."""
    return {"status": "healthy", "service": "forge-api", "version": "0.1.0"}
