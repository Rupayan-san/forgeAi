from datetime import datetime, timezone
from bson import ObjectId
from fastapi import APIRouter, Depends, HTTPException, status
from motor.motor_asyncio import AsyncIOMotorDatabase

from app.core.database import get_db
from app.api.v1.dependencies import get_current_user
from app.models.user import UserModel
from app.models.project import ProjectModel
from app.models.chat import ChatRequest, ChatResponse, ChatMessageModel
from app.services.rag_service import RAGService

router = APIRouter()
rag_service = RAGService()


@router.post("/{project_id}/chat", response_model=ChatResponse)
async def send_chat_message(
    project_id: str,
    chat_request: ChatRequest,
    current_user: UserModel = Depends(get_current_user),
    db: AsyncIOMotorDatabase = Depends(get_db),
):
    """Send a message to the RAG pipeline and get a grounded response."""
    # Verify project access
    project_doc = await db["projects"].find_one({
        "project_id": project_id,
        "members": current_user.user_id,
    })
    if not project_doc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Project not found")

    project = ProjectModel(**project_doc)

    if not project.qdrant_collection_name:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Project has no knowledge base. Sync GitHub or Discord first.",
        )

    result = await rag_service.query(
        project_id=project_id,
        collection_name=project.qdrant_collection_name,
        user_message=chat_request.message,
        user_id=current_user.user_id,
        db=db,
        interface_type=chat_request.interface_type,
    )

    return ChatResponse(**result)


@router.get("/{project_id}/chat/history", response_model=list[ChatResponse])
async def get_chat_history(
    project_id: str,
    current_user: UserModel = Depends(get_current_user),
    db: AsyncIOMotorDatabase = Depends(get_db),
):
    """Get chat history for a project."""
    # Verify project access
    project_doc = await db["projects"].find_one({
        "project_id": project_id,
        "members": current_user.user_id,
    })
    if not project_doc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Project not found")

    cursor = db["chat_history"].find(
        {"project_id": project_id, "user_id": current_user.user_id},
        sort=[("created_at", 1)],
        limit=100,
    )

    messages = []
    async for doc in cursor:
        msg = ChatMessageModel(**doc)
        messages.append(ChatResponse(
            message_id=msg.message_id,
            content=msg.content,
            sources=msg.sources,
            created_at=msg.created_at,
        ))

    return messages
