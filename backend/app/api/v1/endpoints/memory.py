from typing import Optional
from fastapi import APIRouter, Depends, Query

from app.api.v1.permissions import ProjectContext, require_project_member
from app.models.memory import MemorySearchResult
from app.services.memory_service import ProjectMemoryService

router = APIRouter()
memory_service = ProjectMemoryService()


@router.get("/{project_id}/memory/search", response_model=MemorySearchResult)
async def search_memory(
    project_id: str,
    q: str = Query(..., min_length=1, description="Semantic search query"),
    limit: int = Query(default=8, ge=1, le=50),
    source_type: Optional[str] = Query(default=None, description="Optional filter: github_file, discord_message, chat_message, etc."),
    ctx: ProjectContext = Depends(require_project_member),
):
    """Semantic search over the project's vector memory with strict project isolation."""
    source_types = [source_type] if source_type else None
    items = await memory_service.search_project_memory(
        project_id=project_id,
        query_text=q,
        limit=limit,
        source_types=source_types,
        collection_name=ctx.project.qdrant_collection_name,
    )

    return MemorySearchResult(
        project_id=project_id,
        query=q,
        total_results=len(items),
        items=items,
    )
