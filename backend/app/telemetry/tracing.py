import contextlib
import time
from typing import Any, Optional, Generator
from app.core.config import settings

# Attempt OpenTelemetry SDK initialization with graceful fallback
_tracer = None
try:
    if getattr(settings, "TELEMETRY_ENABLED", True):
        from opentelemetry import trace
        from opentelemetry.sdk.trace import TracerProvider
        from opentelemetry.sdk.resources import Resource

        resource = Resource.create({
            "service.name": settings.SERVICE_NAME,
            "environment": settings.ENVIRONMENT,
        })
        provider = TracerProvider(resource=resource)
        trace.set_tracer_provider(provider)
        _tracer = trace.get_tracer("forge-ai")
except Exception:
    _tracer = None


@contextlib.contextmanager
def trace_span(name: str, attributes: Optional[dict[str, Any]] = None) -> Generator[Optional[Any], None, None]:
    """Context manager to create OpenTelemetry trace spans with fail-safe error isolation."""
    attributes = attributes or {}
    span = None
    start_time = time.perf_counter()

    if _tracer:
        try:
            span = _tracer.start_span(name)
            for k, v in attributes.items():
                if v is not None:
                    span.set_attribute(str(k), str(v))
        except Exception:
            span = None

    try:
        yield span
    except Exception as e:
        if span:
            try:
                span.record_exception(e)
                span.set_status(trace.StatusCode.ERROR, str(e))
            except Exception:
                pass
        raise
    finally:
        if span:
            try:
                duration_ms = (time.perf_counter() - start_time) * 1000.0
                span.set_attribute("duration_ms", duration_ms)
                span.end()
            except Exception:
                pass


def get_tracer():
    return _tracer
