// ─────────────────────────────────────────────────────────────────────────────
// Distributed & In-Memory Sliding Window Rate Limiter Middleware
// ─────────────────────────────────────────────────────────────────────────────

import { rateLimitRedis } from '../../../redis.js';

const requestLog = new Map();

/**
 * Creates a rate limiter middleware with Redis distributed support and local fallback.
 * @param {Object} options
 * @param {number} options.windowMs - Time window in milliseconds (default 1 min)
 * @param {number} options.maxRequests - Max allowed requests per window per IP
 * @param {string} options.message - Error message when limit exceeded
 */
export function createRateLimiter({ windowMs = 60 * 1000, maxRequests = 30, message = 'Too many requests. Please slow down.' } = {}) {
  return async (req, res, next) => {
    const ip = req.ip || req.headers['x-forwarded-for'] || req.socket.remoteAddress || 'unknown-ip';

    // 1. Try Redis Distributed Rate Limiter
    const redisResult = await rateLimitRedis(ip, windowMs, maxRequests);
    if (redisResult !== null) {
      res.setHeader('X-RateLimit-Limit', maxRequests);
      res.setHeader('X-RateLimit-Remaining', redisResult.remaining);

      if (!redisResult.allowed) {
        res.setHeader('Retry-After', Math.ceil(windowMs / 1000));
        return res.status(429).json({
          success: false,
          error: message,
          retryAfterSeconds: Math.ceil(windowMs / 1000)
        });
      }
      return next();
    }

    // 2. In-Memory Sliding Window Fallback
    const now = Date.now();
    const windowStart = now - windowMs;

    let timestamps = requestLog.get(ip) || [];
    timestamps = timestamps.filter(t => t > windowStart);

    if (timestamps.length >= maxRequests) {
      const retryAfter = Math.ceil((timestamps[0] + windowMs - now) / 1000);
      res.setHeader('Retry-After', retryAfter);
      return res.status(429).json({
        success: false,
        error: message,
        retryAfterSeconds: retryAfter
      });
    }

    timestamps.push(now);
    requestLog.set(ip, timestamps);

    if (requestLog.size > 1000) {
      for (const [key, list] of requestLog.entries()) {
        const valid = list.filter(t => t > windowStart);
        if (valid.length === 0) requestLog.delete(key);
        else requestLog.set(key, valid);
      }
    }

    next();
  };
}
