// ─────────────────────────────────────────────────────────────────────────────
// redis.js - High-Throughput Redis Cache, Rate Limiter & Distributed Stock Holds
// ─────────────────────────────────────────────────────────────────────────────

import Redis from 'ioredis';

const REDIS_URL = process.env.REDIS_URL || 'redis://127.0.0.1:6379';
const REDIS_CLUSTER_NODES = process.env.REDIS_CLUSTER_NODES ? process.env.REDIS_CLUSTER_NODES.split(',').map(n => n.trim()) : null;

let redisClient = null;
let isConnected = false;
let redisMode = 'in-memory fallback';
let lastPingLatency = null;

try {
  if (REDIS_CLUSTER_NODES && REDIS_CLUSTER_NODES.length > 0) {
    const formattedNodes = REDIS_CLUSTER_NODES.map(node => {
      const [host, port] = node.split(':');
      return { host: host || '127.0.0.1', port: parseInt(port, 10) || 6379 };
    });

    redisClient = new Redis.Cluster(formattedNodes, {
      redisOptions: {
        maxRetriesPerRequest: 1,
        connectTimeout: 3000,
        tls: process.env.REDIS_TLS === 'true' ? {} : undefined
      },
      clusterRetryStrategy(times) {
        if (times > 3) return null;
        return Math.min(times * 150, 1500);
      }
    });
    redisMode = 'cluster';
  } else if (process.env.REDIS_URL) {
    redisClient = new Redis(REDIS_URL, {
      maxRetriesPerRequest: 1,
      connectTimeout: 2000,
      tls: REDIS_URL.startsWith('rediss://') ? {} : undefined,
      retryStrategy(times) {
        if (times > 3) return null; // Graceful fallback to in-memory if offline
        return Math.min(times * 100, 1000);
      }
    });
    redisMode = 'standalone';
  }

  if (redisClient) {
    redisClient.on('connect', () => {
      isConnected = true;
      console.log(`⚡ Connected to Redis (${redisMode}) In-Memory Cache & Distributed Store`);
    });

    redisClient.on('ready', () => {
      isConnected = true;
    });

    redisClient.on('error', (err) => {
      if (isConnected) {
        console.log('ℹ️ Redis Standby Mode:', err.message);
      }
      isConnected = false;
    });
  }
} catch (e) {
  console.log('ℹ️ Redis client fallback enabled:', e.message);
}

/**
 * Returns comprehensive Redis operational status and ping latency
 */
export async function getRedisHealthStatus() {
  if (!isConnected || !redisClient) {
    return {
      status: 'standby',
      mode: 'in-memory fallback',
      connected: false,
      distributedRateLimiting: 'local_fallback',
      latencyMs: null
    };
  }

  try {
    const start = Date.now();
    await redisClient.ping();
    const latency = Date.now() - start;
    lastPingLatency = latency;

    return {
      status: 'operational',
      mode: redisMode,
      connected: true,
      distributedRateLimiting: 'active_redis',
      latencyMs: latency
    };
  } catch (e) {
    return {
      status: 'degraded',
      mode: redisMode,
      connected: false,
      distributedRateLimiting: 'local_fallback',
      latencyMs: null
    };
  }
}

/**
 * Get cached JSON value
 */
export async function getCache(key) {
  if (!isConnected || !redisClient) return null;
  try {
    const data = await redisClient.get(key);
    return data ? JSON.parse(data) : null;
  } catch (e) {
    return null;
  }
}

/**
 * Set cached JSON value with TTL in seconds
 */
export async function setCache(key, value, ttlSeconds = 60) {
  if (!isConnected || !redisClient) return false;
  try {
    await redisClient.set(key, JSON.stringify(value), 'EX', ttlSeconds);
    return true;
  } catch (e) {
    return false;
  }
}

/**
 * Invalidate cache key
 */
export async function delCache(key) {
  if (!isConnected || !redisClient) return false;
  try {
    await redisClient.del(key);
    return true;
  } catch (e) {
    return false;
  }
}

/**
 * Distributed Stock Hold (Reservation with native TTL expiration)
 */
export async function reserveStockHoldRedis(orderId, items = [], ttlSeconds = 600) {
  if (!isConnected || !redisClient || !orderId) return false;
  try {
    const key = `stock_hold:${orderId}`;
    await redisClient.set(key, JSON.stringify({ items, timestamp: Date.now() }), 'EX', ttlSeconds);
    return true;
  } catch (e) {
    return false;
  }
}

/**
 * Releases a distributed stock hold
 */
export async function releaseStockHoldRedis(orderId) {
  if (!isConnected || !redisClient || !orderId) return false;
  try {
    await redisClient.del(`stock_hold:${orderId}`);
    return true;
  } catch (e) {
    return false;
  }
}

/**
 * Distributed Sliding Window Rate Limiting via Redis
 */
export async function rateLimitRedis(ipKey, windowMs, maxRequests) {
  if (!isConnected || !redisClient) return null;
  try {
    const key = `ratelimit:${ipKey}`;
    const now = Date.now();
    const windowStart = now - windowMs;

    const multi = redisClient.multi();
    multi.zremrangebyscore(key, 0, windowStart);
    multi.zadd(key, now, `${now}-${Math.random()}`);
    multi.zcard(key);
    multi.pexpire(key, windowMs);

    const results = await multi.exec();
    const requestCount = results[2][1];

    return {
      allowed: requestCount <= maxRequests,
      current: requestCount,
      limit: maxRequests,
      remaining: Math.max(0, maxRequests - requestCount)
    };
  } catch (e) {
    return null; // Fallback to memory limiter
  }
}

export function isRedisReady() {
  return isConnected;
}
