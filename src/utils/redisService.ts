import { Redis } from '@upstash/redis';

// Upstash Redis configuration
// In production, these should be set as environment variables
const redisUrl = process.env.UPSTASH_REDIS_REST_URL;
const redisToken = process.env.UPSTASH_REDIS_REST_TOKEN;

if (!redisUrl || !redisToken) {
  console.warn('⚠️ Redis configuration missing. Caching will be disabled.');
}

// Initialize Redis client
const redis = redisUrl && redisToken ? new Redis({
  url: redisUrl,
  token: redisToken,
}) : null;

export interface CacheConfig {
  ttl?: number; // Time to live in seconds
  namespace?: string;
}

export class RedisService {
  private static instance: RedisService;
  private isEnabled: boolean;

  constructor() {
    this.isEnabled = !!redis;
    if (this.isEnabled) {
      console.log('✅ Redis caching enabled');
    } else {
      console.log('⚠️ Redis caching disabled - using in-memory fallback');
    }
  }

  static getInstance(): RedisService {
    if (!RedisService.instance) {
      RedisService.instance = new RedisService();
    }
    return RedisService.instance;
  }

  /**
   * Generate cache key with optional namespace
   */
  private getKey(key: string, namespace?: string): string {
    return namespace ? `${namespace}:${key}` : key;
  }

  /**
   * Set value in cache with TTL
   */
  async set(key: string, value: any, config: CacheConfig = {}): Promise<boolean> {
    if (!this.isEnabled) return false;

    try {
      const cacheKey = this.getKey(key, config.namespace);
      const serializedValue = JSON.stringify(value);
      const ttl = config.ttl || 3600; // Default 1 hour

      await redis!.set(cacheKey, serializedValue, { ex: ttl });
      return true;
    } catch (error) {
      console.error('❌ Redis SET error:', error);
      return false;
    }
  }

  /**
   * Get value from cache
   */
  async get<T = any>(key: string, namespace?: string): Promise<T | null> {
    if (!this.isEnabled) return null;

    try {
      const cacheKey = this.getKey(key, namespace);
      const result = await redis!.get(cacheKey);

      if (result) {
        return JSON.parse(result as string) as T;
      }
      return null;
    } catch (error) {
      console.error('❌ Redis GET error:', error);
      return null;
    }
  }

  /**
   * Delete key from cache
   */
  async del(key: string, namespace?: string): Promise<boolean> {
    if (!this.isEnabled) return false;

    try {
      const cacheKey = this.getKey(key, namespace);
      await redis!.del(cacheKey);
      return true;
    } catch (error) {
      console.error('❌ Redis DEL error:', error);
      return false;
    }
  }

  /**
   * Set multiple key-value pairs
   */
  async mset(pairs: Array<{ key: string; value: any }>, config: CacheConfig = {}): Promise<boolean> {
    if (!this.isEnabled) return false;

    try {
      const pipeline = redis!.pipeline();
      const ttl = config.ttl || 3600;

      pairs.forEach(({ key, value }) => {
        const cacheKey = this.getKey(key, config.namespace);
        pipeline.set(cacheKey, JSON.stringify(value), { ex: ttl });
      });

      await pipeline.exec();
      return true;
    } catch (error) {
      console.error('❌ Redis MSET error:', error);
      return false;
    }
  }

  /**
   * Get multiple values by keys
   */
  async mget<T = any>(keys: string[], namespace?: string): Promise<(T | null)[]> {
    if (!this.isEnabled) return keys.map(() => null);

    try {
      const cacheKeys = keys.map(key => this.getKey(key, namespace));
      const results = await redis!.mget(...cacheKeys);

      return results.map(result => result ? JSON.parse(result as string) as T : null);
    } catch (error) {
      console.error('❌ Redis MGET error:', error);
      return keys.map(() => null);
    }
  }

  /**
   * Increment numeric value
   */
  async incr(key: string, namespace?: string): Promise<number | null> {
    if (!this.isEnabled) return null;

    try {
      const cacheKey = this.getKey(key, namespace);
      return await redis!.incr(cacheKey);
    } catch (error) {
      console.error('❌ Redis INCR error:', error);
      return null;
    }
  }

  /**
   * Check if key exists
   */
  async exists(key: string, namespace?: string): Promise<boolean> {
    if (!this.isEnabled) return false;

    try {
      const cacheKey = this.getKey(key, namespace);
      const result = await redis!.exists(cacheKey);
      return result > 0;
    } catch (error) {
      console.error('❌ Redis EXISTS error:', error);
      return false;
    }
  }

  /**
   * Clear all cache keys with optional namespace
   */
  async clear(namespace?: string): Promise<boolean> {
    if (!this.isEnabled) return false;

    try {
      if (namespace) {
        // Get all keys with namespace and delete them
        const pattern = `${namespace}:*`;
        const keys = await redis!.keys(pattern);
        if (keys.length > 0) {
          await redis!.del(...keys);
        }
      } else {
        // Clear all keys (use with caution)
        await redis!.flushall();
      }
      return true;
    } catch (error) {
      console.error('❌ Redis CLEAR error:', error);
      return false;
    }
  }
}

// Export singleton instance
export const redisService = RedisService.getInstance();

// Specific caching functions for the event platform

/**
 * Cache matchmaking results
 */
export async function cacheMatchmakingResults(
  userId: string,
  results: any[],
  ttl: number = 1800 // 30 minutes
): Promise<boolean> {
  return await redisService.set(
    `matchmaking:${userId}`,
    results,
    { ttl, namespace: 'matchmaking' }
  );
}

/**
 * Get cached matchmaking results
 */
export async function getCachedMatchmakingResults(userId: string): Promise<any[] | null> {
  return await redisService.get<any[]>(`matchmaking:${userId}`, 'matchmaking');
}

/**
 * Cache check-in status
 */
export async function cacheCheckinStatus(
  badgeId: string,
  status: any,
  ttl: number = 7200 // 2 hours
): Promise<boolean> {
  return await redisService.set(
    `checkin:${badgeId}`,
    status,
    { ttl, namespace: 'checkins' }
  );
}

/**
 * Get cached check-in status
 */
export async function getCachedCheckinStatus(badgeId: string): Promise<any | null> {
  return await redisService.get(`checkin:${badgeId}`, 'checkins');
}

/**
 * Cache badge generation queue
 */
export async function cacheBadgeQueue(
  eventId: string,
  queueData: any,
  ttl: number = 3600 // 1 hour
): Promise<boolean> {
  return await redisService.set(
    `badge-queue:${eventId}`,
    queueData,
    { ttl, namespace: 'badges' }
  );
}

/**
 * Get cached badge queue
 */
export async function getCachedBadgeQueue(eventId: string): Promise<any | null> {
  return await redisService.get(`badge-queue:${eventId}`, 'badges');
}

/**
 * Cache real-time statistics
 */
export async function cacheRealtimeStats(
  eventId: string,
  stats: any,
  ttl: number = 300 // 5 minutes
): Promise<boolean> {
  return await redisService.set(
    `stats:${eventId}`,
    stats,
    { ttl, namespace: 'analytics' }
  );
}

/**
 * Get cached real-time statistics
 */
export async function getCachedRealtimeStats(eventId: string): Promise<any | null> {
  return await redisService.get(`stats:${eventId}`, 'analytics');
}

/**
 * Increment daily check-in counter
 */
export async function incrementDailyCheckins(eventId: string, date: string): Promise<number | null> {
  return await redisService.incr(`daily-checkins:${eventId}:${date}`, 'analytics');
}

/**
 * Cache user session data
 */
export async function cacheUserSession(
  sessionId: string,
  sessionData: any,
  ttl: number = 86400 // 24 hours
): Promise<boolean> {
  return await redisService.set(
    `session:${sessionId}`,
    sessionData,
    { ttl, namespace: 'sessions' }
  );
}

/**
 * Get cached user session data
 */
export async function getCachedUserSession(sessionId: string): Promise<any | null> {
  return await redisService.get(`session:${sessionId}`, 'sessions');
}
