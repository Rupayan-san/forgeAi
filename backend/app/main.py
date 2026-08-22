import sys

if sys.platform == "win32":
    try:
        if hasattr(sys.stdout, "reconfigure"):
            sys.stdout.reconfigure(encoding="utf-8", errors="replace")
        if hasattr(sys.stderr, "reconfigure"):
            sys.stderr.reconfigure(encoding="utf-8", errors="replace")
    except Exception:
        pass

from fastapi import FastAPI
from app.core.config import settings
from app.core.database import lifespan
from app.core.middleware import setup_middleware
from app.api.v1.router import api_router


def create_app() -> FastAPI:
    """Create and configure the FastAPI application."""
    app = FastAPI(
        title=settings.PROJECT_NAME,
        description="Voice-native AI project memory tool for teams",
        version="0.1.0",
        lifespan=lifespan,
        docs_url="/docs" if settings.DEBUG else None,
        redoc_url="/redoc" if settings.DEBUG else None,
    )

    # Setup middleware
    setup_middleware(app)

    # Include API router
    app.include_router(api_router, prefix=settings.API_V1_STR)

    @app.get("/metrics")
    async def prometheus_metrics():
        """Prometheus metrics scrape endpoint."""
        from fastapi.responses import Response
        from app.telemetry.metrics import get_prometheus_metrics_payload
        payload, content_type = get_prometheus_metrics_payload()
        return Response(content=payload, media_type=content_type)

    @app.get("/")
    async def root():
        return {
            "name": settings.PROJECT_NAME,
            "version": "0.1.0",
            "docs": "/docs" if settings.DEBUG else "disabled",
            "metrics": "/metrics",
        }

    return app


app = create_app()
