/**
 * Simple in-memory cache with TTL for better scalability
 * Reduces redundant API calls and improves performance
 */

interface CacheEntry<T> {
  data: T;
  timestamp: number;
  ttl: number; // Time to live in milliseconds
}

export class Cache {
  private static instance: Cache;
  private cache: Map<string, CacheEntry<any>>;
  private maxSize: number;

  private constructor(maxSize: number = 1000) {
    this.cache = new Map();
    this.maxSize = maxSize;
    
    // Clean up expired entries every minute
    setInterval(() => this.cleanup(), 60000);
  }

  static getInstance(maxSize?: number): Cache {
    if (!Cache.instance) {
      Cache.instance = new Cache(maxSize);
    }
    return Cache.instance;
  }

  /**
   * Get value from cache
   */
  get<T>(key: string): T | null {
    const entry = this.cache.get(key);
    
    if (!entry) {
      return null;
    }

    // Check if expired
    const now = Date.now();
    if (now - entry.timestamp > entry.ttl) {
      this.cache.delete(key);
      return null;
    }

    return entry.data as T;
  }

  /**
   * Set value in cache
   */
  set<T>(key: string, data: T, ttl: number = 60000): void {
    // Evict oldest entries if cache is full
    if (this.cache.size >= this.maxSize) {
      this.evictOldest();
    }

    this.cache.set(key, {
      data,
      timestamp: Date.now(),
      ttl,
    });
  }

  /**
   * Delete value from cache
   */
  delete(key: string): void {
    this.cache.delete(key);
  }

  /**
   * Clear all cache
   */
  clear(): void {
    this.cache.clear();
  }

  /**
   * Get cache size
   */
  size(): number {
    return this.cache.size;
  }

  /**
   * Clean up expired entries
   */
  private cleanup(): void {
    const now = Date.now();
    for (const [key, entry] of this.cache.entries()) {
      if (now - entry.timestamp > entry.ttl) {
        this.cache.delete(key);
      }
    }
  }

  /**
   * Evict oldest entry
   */
  private evictOldest(): void {
    let oldestKey: string | null = null;
    let oldestTimestamp = Infinity;

    for (const [key, entry] of this.cache.entries()) {
      if (entry.timestamp < oldestTimestamp) {
        oldestTimestamp = entry.timestamp;
        oldestKey = key;
      }
    }

    if (oldestKey) {
      this.cache.delete(oldestKey);
    }
  }
}

/**
 * Cache decorator for async functions
 */
export function cached<T extends (...args: any[]) => Promise<any>>(
  fn: T,
  options: {
    keyGenerator?: (...args: Parameters<T>) => string;
    ttl?: number;
    cache?: Cache;
  } = {}
): T {
  const {
    keyGenerator = (...args) => JSON.stringify(args),
    ttl = 60000, // 1 minute default
    cache = Cache.getInstance(),
  } = options;

  return (async (...args: Parameters<T>): Promise<ReturnType<T>> => {
    const key = `${fn.name}_${keyGenerator(...args)}`;
    
    // Try to get from cache
    const cached = cache.get<ReturnType<T>>(key);
    if (cached !== null) {
      return cached;
    }

    // Execute function and cache result
    const result = await fn(...args);
    cache.set(key, result, ttl);
    
    return result;
  }) as T;
}

