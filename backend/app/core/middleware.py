from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.core.config import settings
from app.telemetry.middleware import TelemetryMiddleware


def setup_middleware(app: FastAPI) -> None:
    """Configure application middleware."""
    # 1. Telemetry & Request Correlation Middleware
    app.add_middleware(TelemetryMiddleware)

    # 2. CORS — credentials must be True for HttpOnly cookie refresh tokens
    app.add_middleware(
        CORSMiddleware,
        allow_origins=[
            settings.FRONTEND_URL,
            "http://localhost:3000",
            "http://localhost:3001",
            "http://127.0.0.1:3000",
            "http://127.0.0.1:3001",
        ],
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
        expose_headers=["Set-Cookie", "X-Request-ID"],
    )

