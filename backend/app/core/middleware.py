from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.core.config import settings


def setup_middleware(app: FastAPI) -> None:
    """Configure application middleware."""
    # CORS
    app.add_middleware(
        CORSMiddleware,
        allow_origins=[
            settings.FRONTEND_URL,
            "http://localhost:3000",
            "http://localhost:3001",
        ],
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )
