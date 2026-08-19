from datetime import datetime, timedelta, timezone
from typing import Any

from jose import jwt, JWTError
from cryptography.fernet import Fernet

from app.core.config import settings


# Fernet key for encrypting sensitive tokens (GitHub access tokens)
# In production, this should be a separate env var
_fernet_key = Fernet.generate_key()
_fernet = Fernet(_fernet_key)


def create_access_token(data: dict[str, Any], expires_delta: timedelta | None = None) -> str:
    """Create a JWT access token."""
    to_encode = data.copy()
    expire = datetime.now(timezone.utc) + (
        expires_delta or timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    )
    to_encode.update({"exp": expire})
    return jwt.encode(to_encode, settings.SECRET_KEY, algorithm=settings.ALGORITHM)


def decode_access_token(token: str) -> dict[str, Any] | None:
    """Decode and verify a JWT access token."""
    try:
        payload = jwt.decode(token, settings.SECRET_KEY, algorithms=[settings.ALGORITHM])
        return payload
    except JWTError:
        return None


def encrypt_token(token: str) -> str:
    """Encrypt a sensitive token (e.g., GitHub access token) for storage."""
    return _fernet.encrypt(token.encode()).decode()


def decrypt_token(encrypted_token: str) -> str:
    """Decrypt a stored sensitive token."""
    return _fernet.decrypt(encrypted_token.encode()).decode()
