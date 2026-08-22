import json
import time
from typing import Optional, Any
from redis import Redis

from app.core.config import settings


class RedisCacheService:
    """Project-isolated, selective Redis caching with in-memory fallback, explicit invalidation, and fail-safe fallback."""

    def __init__(self, redis_url: Optional[str] = None):
        self.redis_url = redis_url or settings.REDIS_URL
        self._client: Optional[Redis] = None
        self._redis_checked = False
        self._redis_available = False
        self._memory_cache: dict[str, tuple[float, str]] = {}

    def _check_redis(self) -> None:
        if self._redis_checked:
            return
        self._redis_checked = True
        try:
            client = Redis.from_url(
                self.redis_url,
                socket_timeout=0.2,
                socket_connect_timeout=0.2,
                decode_responses=True,
            )
            client.ping()
            self._client = client
            self._redis_available = True
        except Exception:
            self._client = None
            self._redis_available = False

    @property
    def client(self) -> Optional[Redis]:
        """Lazy-loaded Redis connection with error isolation."""
        self._check_redis()
        return self._client

    # Key helpers with strict project isolation
    @staticmethod
    def _constitution_key(project_id: str) -> str:
        return f"forge:proj:{project_id}:constitution"

    @staticmethod
    def _decisions_key(project_id: str) -> str:
        return f"forge:proj:{project_id}:decisions:active"

    @staticmethod
    def _state_key(project_id: str) -> str:
        return f"forge:proj:{project_id}:state_snapshot"

    def get_json(self, key: str) -> Optional[dict[str, Any]]:
        """Safely fetch and parse a JSON cache entry."""
        try:
            c = self.client
            if c and self._redis_available:
                val = c.get(key)
                if val:
                    return json.loads(val)
        except Exception:
            pass

        # In-memory fallback
        if key in self._memory_cache:
            exp, val = self._memory_cache[key]
            if time.time() < exp:
                try:
                    return json.loads(val)
                except Exception:
                    pass
            else:
                self._memory_cache.pop(key, None)

        return None

    def set_json(self, key: str, data: dict[str, Any], ttl_seconds: int = 300) -> bool:
        """Safely store a JSON cache entry with TTL."""
        payload = json.dumps(data, default=str)
        success = False
        try:
            c = self.client
            if c and self._redis_available:
                success = bool(c.set(key, payload, ex=ttl_seconds))
        except Exception:
            pass

        # In-memory cache
        self._memory_cache[key] = (time.time() + ttl_seconds, payload)
        return True

    def delete(self, key: str) -> bool:
        """Safely invalidate a cache key."""
        success = False
        try:
            c = self.client
            if c and self._redis_available:
                success = bool(c.delete(key))
        except Exception:
            pass

        if key in self._memory_cache:
            self._memory_cache.pop(key, None)
            return True
        return success or True

    # High-level cache & invalidation methods
    def get_cached_constitution(self, project_id: str) -> Optional[dict[str, Any]]:
        return self.get_json(self._constitution_key(project_id))

    def set_cached_constitution(self, project_id: str, data: dict[str, Any], ttl: int = 600) -> bool:
        return self.set_json(self._constitution_key(project_id), data, ttl_seconds=ttl)

    def invalidate_constitution(self, project_id: str) -> bool:
        return self.delete(self._constitution_key(project_id))

    def get_cached_state_snapshot(self, project_id: str) -> Optional[dict[str, Any]]:
        return self.get_json(self._state_key(project_id))

    def set_cached_state_snapshot(self, project_id: str, data: dict[str, Any], ttl: int = 300) -> bool:
        return self.set_json(self._state_key(project_id), data, ttl_seconds=ttl)

    def invalidate_state_snapshot(self, project_id: str) -> bool:
        return self.delete(self._state_key(project_id))

    def invalidate_project_all(self, project_id: str) -> None:
        """Invalidate all cached entities for a given project."""
        self.invalidate_constitution(project_id)
        self.invalidate_state_snapshot(project_id)
        self.delete(self._decisions_key(project_id))


# Singleton instance
cache_service = RedisCacheService()
