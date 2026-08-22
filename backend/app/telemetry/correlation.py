import uuid
from contextvars import ContextVar
from typing import Optional

_request_id_ctx_var: ContextVar[str] = ContextVar("request_id", default="")
_project_id_ctx_var: ContextVar[str] = ContextVar("project_id", default="")
_user_id_ctx_var: ContextVar[str] = ContextVar("user_id", default="")


def generate_request_id() -> str:
    """Generate a unique request / correlation identifier."""
    return f"req_{uuid.uuid4().hex[:16]}"


def set_correlation_context(
    request_id: Optional[str] = None,
    project_id: Optional[str] = None,
    user_id: Optional[str] = None,
) -> None:
    """Set the current async request correlation context."""
    if request_id is not None:
        _request_id_ctx_var.set(request_id)
    if project_id is not None:
        _project_id_ctx_var.set(project_id)
    if user_id is not None:
        _user_id_ctx_var.set(user_id)


def get_request_id() -> str:
    return _request_id_ctx_var.get()


def get_project_id() -> str:
    return _project_id_ctx_var.get()


def get_user_id() -> str:
    return _user_id_ctx_var.get()
