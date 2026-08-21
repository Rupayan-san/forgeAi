from fastapi import APIRouter, Depends
from app.api.v1.dependencies import get_current_user
from app.models.user import UserModel
from app.services.architecture_service import build_architecture_graph

router = APIRouter()


@router.get("/architecture")
async def get_architecture_graph(
    current_user: UserModel = Depends(get_current_user),
):
    """Dynamically parses actual backend Python files (ast) and frontend page.tsx
    files (regex) at request time. Not a hand-maintained diagram — reflects real
    imports, registered routes, and real frontend→backend calls, including calls
    that don't match any real route (surfaced as gaps, not hidden).
    """
    return build_architecture_graph()
