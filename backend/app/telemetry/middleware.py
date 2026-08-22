import time
from starlette.middleware.base import BaseHTTPMiddleware, RequestResponseEndpoint
from starlette.requests import Request
from starlette.responses import Response

from app.telemetry.correlation import generate_request_id, set_correlation_context
from app.telemetry.logging import structured_log
from app.telemetry.metrics import metrics
from app.telemetry.tracing import trace_span


class TelemetryMiddleware(BaseHTTPMiddleware):
    """Middleware for request correlation, Prometheus latency tracking, and structured logging."""

    async def dispatch(self, request: Request, call_next: RequestResponseEndpoint) -> Response:
        # 1. Extract or generate request ID
        req_id = request.headers.get("X-Request-ID") or request.headers.get("X-Correlation-ID") or generate_request_id()

        # Extract project_id from path if available
        path_parts = request.url.path.strip("/").split("/")
        proj_id = ""
        if len(path_parts) >= 2 and path_parts[0] in ["projects", "api"]:
            for i, p in enumerate(path_parts):
                if p == "projects" and i + 1 < len(path_parts):
                    proj_id = path_parts[i + 1]
                    break

        set_correlation_context(request_id=req_id, project_id=proj_id)

        start_time = time.perf_counter()
        status_code = 500

        try:
            with trace_span(f"HTTP {request.method} {request.url.path}", {"http.method": request.method, "http.url": str(request.url), "request_id": req_id}):
                response = await call_next(request)
                status_code = response.status_code
                response.headers["X-Request-ID"] = req_id
                return response
        except Exception as exc:
            structured_log(
                "ERROR",
                f"Unhandled exception during {request.method} {request.url.path}: {exc}",
                operation="http_request",
                status_code=500,
                path=request.url.path,
            )
            raise
        finally:
            duration_s = time.perf_counter() - start_time
            duration_ms = duration_s * 1000.0

            # Record Prometheus metrics
            metrics.record_http_request(
                method=request.method,
                endpoint=request.url.path,
                status_code=status_code,
                duration_seconds=duration_s,
            )

            # Emit structured request log (excluding polling / health logs in production)
            if not request.url.path.endswith("/health") and not request.url.path.endswith("/metrics"):
                structured_log(
                    "INFO",
                    f"{request.method} {request.url.path} -> {status_code} ({duration_ms:.1f}ms)",
                    operation="http_request",
                    duration_ms=duration_ms,
                    status_code=status_code,
                    path=request.url.path,
                )
