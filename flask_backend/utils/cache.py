"""
Simple in-memory cache with TTL for better scalability
Reduces redundant database queries and improves performance
"""
from datetime import datetime, timedelta
from typing import Any, Optional, Callable
import threading
import time

class CacheEntry:
    def __init__(self, data: Any, ttl: int = 60):
        self.data = data
        self.timestamp = datetime.now()
        self.ttl = timedelta(seconds=ttl)

    def is_expired(self) -> bool:
        return datetime.now() - self.timestamp > self.ttl


class Cache:
    """Thread-safe in-memory cache with TTL"""
    
    def __init__(self, max_size: int = 1000):
        self.cache: dict[str, CacheEntry] = {}
        self.max_size = max_size
        self.lock = threading.Lock()
        self._cleanup_interval = 300  # 5 minutes
        self._last_cleanup = time.time()

    def get(self, key: str) -> Optional[Any]:
        """Get value from cache"""
        with self.lock:
            self._cleanup_if_needed()
            
            entry = self.cache.get(key)
            if entry is None:
                return None
            
            if entry.is_expired():
                del self.cache[key]
                return None
            
            return entry.data

    def set(self, key: str, data: Any, ttl: int = 60) -> None:
        """Set value in cache"""
        with self.lock:
            self._cleanup_if_needed()
            
            # Evict oldest if cache is full
            if len(self.cache) >= self.max_size and key not in self.cache:
                self._evict_oldest()
            
            self.cache[key] = CacheEntry(data, ttl)

    def delete(self, key: str) -> None:
        """Delete value from cache"""
        with self.lock:
            self.cache.pop(key, None)

    def clear(self) -> None:
        """Clear all cache"""
        with self.lock:
            self.cache.clear()

    def _cleanup_if_needed(self) -> None:
        """Clean up expired entries if enough time has passed"""
        now = time.time()
        if now - self._last_cleanup < self._cleanup_interval:
            return
        
        self._last_cleanup = now
        expired_keys = [
            key for key, entry in self.cache.items()
            if entry.is_expired()
        ]
        for key in expired_keys:
            del self.cache[key]

    def _evict_oldest(self) -> None:
        """Evict oldest entry"""
        if not self.cache:
            return
        
        oldest_key = min(
            self.cache.keys(),
            key=lambda k: self.cache[k].timestamp
        )
        del self.cache[oldest_key]

    def size(self) -> int:
        """Get cache size"""
        with self.lock:
            return len(self.cache)


# Global cache instance
_cache_instance: Optional[Cache] = None


def get_cache() -> Cache:
    """Get global cache instance"""
    global _cache_instance
    if _cache_instance is None:
        _cache_instance = Cache()
    return _cache_instance


def cached(ttl: int = 60):
    """Decorator to cache function results"""
    def decorator(func: Callable) -> Callable:
        cache = get_cache()
        
        def wrapper(*args, **kwargs):
            # Generate cache key from function name and arguments
            key = f"{func.__name__}:{str(args)}:{str(sorted(kwargs.items()))}"
            
            # Try to get from cache
            cached_result = cache.get(key)
            if cached_result is not None:
                return cached_result
            
            # Execute function and cache result
            result = func(*args, **kwargs)
            cache.set(key, result, ttl)
            
            return result
        
        return wrapper
    return decorator

