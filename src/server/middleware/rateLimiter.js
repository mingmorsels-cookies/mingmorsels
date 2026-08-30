// ─────────────────────────────────────────────────────────────────────────────
// Distributed & In-Memory Sliding Window Rate Limiter with IP Jailing
// ─────────────────────────────────────────────────────────────────────────────

import { rateLimitRedis } from '../../../redis.js';

const requestLog = new Map();
const bannedIps = new Map(); // IP -> { unbanAt: timestamp, strikes: count }

/**
 * Checks if an IP is currently jailed due to excessive violations.
 */
function isIpJailed(ip) {
  const banInfo = bannedIps.get(ip);
  if (!banInfo) return false;
  if (Date.now() > banInfo.unbanAt) {
    bannedIps.delete(ip);
    return false;
  }
  return true;
}

/**
 * Records a security strike against an IP and jails it if threshold exceeded.
 */
export function recordSecurityStrike(ip, strikeReason = 'Repeated security violation') {
  const now = Date.now();
  const banInfo = bannedIps.get(ip) || { strikes: 0, unbanAt: 0 };
  banInfo.strikes += 1;

  if (banInfo.strikes >= 5) {
    banInfo.unbanAt = now + 15 * 60 * 1000; // 15-minute jail
    console.warn(`🚨 [SECURITY JAIL] IP ${ip} jailed for 15 minutes due to: ${strikeReason}`);
  }
  bannedIps.set(ip, banInfo);
}

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

    // 0. Check IP Jailing
    if (isIpJailed(ip)) {
      const ban = bannedIps.get(ip);
      const remainingSecs = Math.ceil((ban.unbanAt - Date.now()) / 1000);
      res.setHeader('Retry-After', remainingSecs);
      return res.status(403).json({
        success: false,
        error: `Access temporarily restricted due to repeated security policy violations. Try again in ${remainingSecs}s.`,
        retryAfterSeconds: remainingSecs
      });
    }

    // 1. Try Redis Distributed Rate Limiter
    const redisResult = await rateLimitRedis(ip, windowMs, maxRequests);
    if (redisResult !== null) {
      res.setHeader('X-RateLimit-Limit', maxRequests);
      res.setHeader('X-RateLimit-Remaining', redisResult.remaining);

      if (!redisResult.allowed) {
        recordSecurityStrike(ip, 'Exceeded distributed rate limit');
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
      recordSecurityStrike(ip, 'Exceeded in-memory sliding window rate limit');
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
