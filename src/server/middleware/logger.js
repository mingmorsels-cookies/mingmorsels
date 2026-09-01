// ─────────────────────────────────────────────────────────────────────────────
// High-Performance Structured Request Logger & Observability Middleware
// ─────────────────────────────────────────────────────────────────────────────

import crypto from 'crypto';

export function structuredLogger() {
  return (req, res, next) => {
    const startTime = Date.now();
    const requestId = req.headers['x-request-id'] || `req_${crypto.randomBytes(6).toString('hex')}`;
    
    // Attach requestId to request and response header
    req.id = requestId;
    res.setHeader('X-Request-Id', requestId);

    // Skip verbose logs for health checks and static favicon requests
    const isQuiet = req.path === '/api/health' || req.path === '/favicon.ico' || req.path.endsWith('.stream');

    res.on('finish', () => {
      if (isQuiet && res.statusCode < 400) return;

      const durationMs = Date.now() - startTime;
      const clientIp = req.headers['cf-connecting-ip'] || 
                       req.headers['true-client-ip'] || 
                       (req.headers['x-forwarded-for'] ? req.headers['x-forwarded-for'].split(',')[0].trim() : null) || 
                       req.ip || 
                       'internal';

      const logEntry = {
        level: res.statusCode >= 500 ? 'ERROR' : (res.statusCode >= 400 ? 'WARN' : 'INFO'),
        timestamp: new Date().toISOString(),
        reqId: requestId,
        method: req.method,
        path: req.originalUrl || req.url,
        status: res.statusCode,
        durationMs,
        ip: clientIp
      };

      if (res.statusCode >= 400) {
        console.error(JSON.stringify(logEntry));
      } else {
        console.log(JSON.stringify(logEntry));
      }
    });

    next();
  };
}
