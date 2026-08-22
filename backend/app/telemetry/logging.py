import json
import logging
import re
import sys
from datetime import datetime, timezone
from typing import Any, Optional

from app.core.config import settings
from app.telemetry.correlation import get_request_id, get_project_id, get_user_id

# Regex patterns for sensitive key/token redaction
SENSITIVE_PATTERNS = [
    (re.compile(r"(api[_-]?key|secret|password|token|bearer|access_token|authorization)[\"']?\s*[:=]\s*[\"']?([^\"'\s,]+)", re.IGNORECASE), r"\1=[REDACTED]"),
    (re.compile(r"(ghp_[a-zA-Z0-9]+|gho_[a-zA-Z0-9]+|sk-[a-zA-Z0-9]{20,})"), r"[REDACTED_SECRET]"),
]


def redact_sensitive_data(text: str) -> str:
    """Sanitize secrets, access tokens, and passwords from logs."""
    if not text or not isinstance(text, str):
        return text
    sanitized = text
    for pattern, repl in SENSITIVE_PATTERNS:
        sanitized = pattern.sub(repl, sanitized)
    return sanitized


class StructuredJsonFormatter(logging.Formatter):
    """Formats log records as structured JSON with correlation context."""

    def format(self, record: logging.LogRecord) -> str:
        log_obj = {
            "timestamp": datetime.now(timezone.utc).isoformat(),
            "level": record.levelname,
            "logger": record.name,
            "service": settings.SERVICE_NAME,
            "environment": settings.ENVIRONMENT,
            "request_id": get_request_id() or getattr(record, "request_id", None),
            "project_id": get_project_id() or getattr(record, "project_id", None),
            "user_id": get_user_id() or getattr(record, "user_id", None),
            "message": redact_sensitive_data(record.getMessage()),
        }

        # Include extra attributes if present
        for key in ["operation", "duration_ms", "status_code", "model", "chunks_count"]:
            if hasattr(record, key):
                log_obj[key] = getattr(record, key)

        if record.exc_info:
            log_obj["exception"] = self.formatException(record.exc_info)

        return json.dumps({k: v for k, v in log_obj.items() if v is not None})


def get_logger(name: str = "forge") -> logging.Logger:
    """Get or configure structured application logger."""
    logger = logging.getLogger(name)
    if not logger.handlers:
        handler = logging.StreamHandler(sys.stdout)
        handler.setFormatter(StructuredJsonFormatter())
        logger.addHandler(handler)
        logger.setLevel(logging.INFO if not settings.DEBUG else logging.DEBUG)
        logger.propagate = False
    return logger


def structured_log(
    level: str,
    message: str,
    operation: Optional[str] = None,
    duration_ms: Optional[float] = None,
    **kwargs: Any,
) -> None:
    """Helper to emit structured log with metadata and correlation context."""
    logger = get_logger("forge")
    extra = {
        "operation": operation,
        "duration_ms": round(duration_ms, 2) if duration_ms is not None else None,
        **kwargs,
    }
    log_func = getattr(logger, level.lower(), logger.info)
    log_func(message, extra=extra)
