import asyncio
import time
from collections import deque
from typing import Deque, Dict, Tuple


class InMemoryRateLimiter:
    """Simple per-process fixed-window rate limiter."""

    def __init__(self) -> None:
        self._events: Dict[Tuple[str, str], Deque[float]] = {}
        self._lock = asyncio.Lock()

    async def allow(self, scope: str, key: str, max_requests: int, window_seconds: int) -> tuple[bool, int, int]:
        """Return (allowed, remaining, retry_after_seconds)."""
        now = time.time()
        window_start = now - window_seconds

        async with self._lock:
            event_key = (scope, key)
            queue = self._events.setdefault(event_key, deque())

            while queue and queue[0] <= window_start:
                queue.popleft()

            if len(queue) >= max_requests:
                oldest = queue[0]
                retry_after = max(1, int((oldest + window_seconds) - now))
                return False, 0, retry_after

            queue.append(now)
            remaining = max(0, max_requests - len(queue))
            return True, remaining, 0


rate_limiter = InMemoryRateLimiter()
