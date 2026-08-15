"""
Gemini API Token-Bucket Rate Limiter
-------------------------------------
Keeps all Gemini calls across the app under the free-tier limit of 15 RPM.
Import `gemini_limiter` and call `await gemini_limiter.acquire()` before
every `client.models.generate_content()` call.
"""
import asyncio
import time


class GeminiRateLimiter:
    """
    Token-bucket rate limiter for the Gemini API.
    Default: 14 requests/minute (stays safely under 15 RPM free-tier limit).
    """

    def __init__(self, requests_per_minute: int = 14):
        self.rpm = requests_per_minute
        self.tokens: float = float(requests_per_minute)
        self.last_refill: float = time.monotonic()
        self._lock = asyncio.Lock()

    async def acquire(self) -> None:
        """Block until a request token is available."""
        async with self._lock:
            now = time.monotonic()
            elapsed = now - self.last_refill

            # Refill tokens proportionally to elapsed time
            self.tokens = min(
                float(self.rpm),
                self.tokens + elapsed * (self.rpm / 60.0)
            )
            self.last_refill = now

            if self.tokens < 1.0:
                # Calculate exact wait needed for one token
                wait_seconds = (1.0 - self.tokens) * (60.0 / self.rpm)
                await asyncio.sleep(wait_seconds)
                self.tokens = 0.0
            else:
                self.tokens -= 1.0


# Singleton — import this instance everywhere
gemini_limiter = GeminiRateLimiter(requests_per_minute=14)
