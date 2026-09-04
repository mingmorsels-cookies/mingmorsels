// ─────────────────────────────────────────────────────────────────────────────
// mingmorsels - Production-Grade Express API Server
// ─────────────────────────────────────────────────────────────────────────────

import dotenv from 'dotenv';
dotenv.config();

import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import crypto from 'crypto';

// Database initialization
import { initPostgresTables } from './db.js';

// Modular Route Handlers
import orderRoutes from './src/server/routes/order.routes.js';
import adminRoutes from './src/server/routes/admin.routes.js';
import pincodeRoutes from './src/server/routes/pincode.routes.js';
import analyticsRoutes from './src/server/routes/analytics.routes.js';
import reviewRoutes from './src/server/routes/review.routes.js';
import pushRoutes from './src/server/routes/push.routes.js';
import webpush from 'web-push';
import { createRateLimiter } from './src/server/middleware/rateLimiter.js';
import { structuredLogger } from './src/server/middleware/logger.js';
import path from 'path';
import fs from 'fs';
import { securitySanitizer } from './src/server/middleware/sanitizer.js';
import { ADMIN_SECRET_KEY } from './src/server/middleware/auth.js';
import { getRedisHealthStatus } from './redis.js';

export const app = express();
const PORT = process.env.PORT || 5001;

// Trust reverse proxy / Cloudflare / WAF hops (enables correct IP extraction and secure cookie headers)
app.set('trust proxy', 1);

// Configure Web Push VAPID Keys
const dynamicVapid = (!process.env.VAPID_PUBLIC_KEY || !process.env.VAPID_PRIVATE_KEY) ? webpush.generateVAPIDKeys() : null;
export const VAPID_PUBLIC_KEY = process.env.VAPID_PUBLIC_KEY || dynamicVapid?.publicKey;
export const VAPID_PRIVATE_KEY = process.env.VAPID_PRIVATE_KEY || dynamicVapid?.privateKey;

if (!process.env.VAPID_PUBLIC_KEY && process.env.NODE_ENV !== 'test') {
  console.log('🔔 [WebPush] Using dynamically generated VAPID keypair for session.');
}

try {
  if (VAPID_PUBLIC_KEY && VAPID_PRIVATE_KEY) {
    webpush.setVapidDetails(
      'mailto:mingmorsels@gmail.com',
      VAPID_PUBLIC_KEY,
      VAPID_PRIVATE_KEY
    );
    console.log('🔔 [WebPush] VAPID gateway active and ready.');
  }
} catch (vapidErr) {
  console.warn('⚠️ Web Push VAPID initialization warning:', vapidErr.message);
}

// 1. Structured JSON Request Logger & Tracing
app.use(structuredLogger());

// Dynamic Request-Scoped Cryptographic Nonce for CSP Hardening
app.use((req, res, next) => {
  res.locals.cspNonce = crypto.randomBytes(16).toString('base64');
  next();
});

// 2. Enterprise Security Headers via Helmet with Hardened Nonce-based CSP & HSTS
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: [
        "'self'",
        (req, res) => `'nonce-${res.locals.cspNonce}'`,
        "https://checkout.razorpay.com",
        "https://cdn.razorpay.com",
        "https://accounts.google.com",
        "https://apis.google.com",
        "https://www.gstatic.com",
        "https://cdnjs.cloudflare.com",
        "blob:"
      ],
      scriptSrcAttr: ["'unsafe-inline'"],
      styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com", "https://accounts.google.com"],
      fontSrc: ["'self'", "https://fonts.gstatic.com", "data:"],
      imgSrc: ["'self'", "data:", "https:", "blob:"],
      connectSrc: ["'self'", "https://api.razorpay.com", "https://lumberjack.razorpay.com", "https://accounts.google.com", "https://*.googleapis.com"],
      frameSrc: ["'self'", "https://api.razorpay.com", "https://checkout.razorpay.com", "https://accounts.google.com", "https://www.instagram.com", "https://www.google.com"],
      workerSrc: ["'self'", "blob:"],
      frameAncestors: ["'self'"],
      objectSrc: ["'none'"],
      upgradeInsecureRequests: []
    }
  },
  hsts: {
    maxAge: 31536000,
    includeSubDomains: true,
    preload: true
  },
  crossOriginEmbedderPolicy: false,
  crossOriginOpenerPolicy: { policy: 'same-origin-allow-popups' },
  crossOriginResourcePolicy: false,
  frameguard: { action: 'deny' },
  referrerPolicy: { policy: 'strict-origin-when-cross-origin' },
  noSniff: true,
  xssFilter: true
}));

// Additional Custom Security Headers Middleware
app.use((req, res, next) => {
  res.setHeader('Permissions-Policy', 'geolocation=(), camera=(), microphone=(), payment=(self "https://checkout.razorpay.com")');
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-XSS-Protection', '1; mode=block');
  next();
});

// Strict Block for Sensitive Server, Database, and Config Assets
const SENSITIVE_PATTERNS = [
  /data_store\.json/i,
  /\.env/i,
  /\.git/i,
  /package(-lock)?\.json/i,
  /docker/i,
  /railway\.json/i,
  /db\.js/i,
  /server\.js/i,
  /redis\.js/i,
  /\.sql/i,
  /\/src\/server/i,
  /\/server\//i,
  /tests?\//i,
  /\.test\.js/i
];

app.use((req, res, next) => {
  const reqPath = req.path.toLowerCase();
  if (SENSITIVE_PATTERNS.some(pattern => pattern.test(reqPath))) {
    return res.status(404).json({ success: false, error: 'Resource not found' });
  }
  next();
});

// 3. Hardened CORS Whitelist Configuration
const envOrigins = (process.env.ALLOWED_ORIGINS || '')
  .split(',')
  .map(s => s.trim())
  .filter(Boolean);

const ALLOWED_ORIGINS = [
  'http://localhost:5173',
  'http://127.0.0.1:5173',
  'http://localhost:5001',
  'http://127.0.0.1:5001',
  'https://mingmorsels.com',
  'https://www.mingmorsels.com',
  ...envOrigins
];

app.use(cors({
  origin: (origin, callback) => {
    // Allow non-browser requests (e.g. server-to-server / curl) or strictly whitelisted origins
    if (!origin || ALLOWED_ORIGINS.includes(origin) || /^http:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(origin)) {
      return callback(null, true);
    }
    return callback(new Error('CORS Policy: Request from unauthorized origin blocked.'));
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'x-admin-key', 'x-razorpay-signature']
}));

// 4. Body Parsing Middleware with Raw Body Buffer Capture for Webhooks
app.use(express.json({
  limit: '2mb',
  verify: (req, res, buf) => {
    req.rawBody = buf;
  }
}));
app.use(express.urlencoded({ extended: true, limit: '2mb' }));

// 5. Deep Input Sanitization & Prototype Pollution Defense
app.use(securitySanitizer());

// 6. Rate Limiting Protection (Sliding Window)
const generalLimiter = createRateLimiter({
  windowMs: 60 * 1000,
  maxRequests: 300,
  message: 'Too many requests from your network. Please slow down.'
});
const paymentLimiter = createRateLimiter({
  windowMs: 60 * 1000,
  maxRequests: 100,
  message: 'Payment request limit reached. Please wait a minute.'
});
const adminLimiter = createRateLimiter({
  windowMs: 60 * 1000,
  maxRequests: 500,
  message: 'Admin access rate limit reached. Please slow down.'
});
const authLimiter = createRateLimiter({
  windowMs: 60 * 1000,
  maxRequests: 50,
  message: 'Authentication rate limit reached. Please slow down.'
});

app.use('/api', generalLimiter);
app.use('/api/payment', paymentLimiter);
app.use('/api/admin', adminLimiter);
app.use('/api/customer/auth', authLimiter);

// 7. Health Check Endpoint
app.get('/api/health', async (req, res) => {
  const redisHealth = await getRedisHealthStatus();
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    service: 'mingmorsels Artisanal Confectionery API',
    environment: process.env.NODE_ENV || 'development',
    redis: redisHealth
  });
});

// 8. Mount Modular API Routers
app.use('/api', orderRoutes);
app.use('/api', adminRoutes);
app.use('/api', pincodeRoutes);
app.use('/api', analyticsRoutes);
app.use('/api', reviewRoutes);
app.use('/', pushRoutes); // Handles both /api/push/* and /api/admin/push/*

// 9. Safe Dynamic Nonce-Injected HTML Serving (Takes precedence over raw static files)
const PUBLIC_HTML_PAGES = new Set([
  'index.html',
  'about.html',
  'admin.html',
  'bulk-order.html',
  'chatbot.html',
  'contact.html',
  'experience-center.html',
  'order-confirmation.html',
  'privacy.html',
  'product.html',
  'refund.html',
  'shipping.html',
  'terms.html',
  'track-order.html'
]);

app.get(['/', '/:page.html', '/:page'], async (req, res, next) => {
  const param = req.params.page ? (req.params.page.endsWith('.html') ? req.params.page : `${req.params.page}.html`) : 'index.html';
  if (PUBLIC_HTML_PAGES.has(param)) {
    try {
      const distPath = path.resolve('dist', param);
      const rootPath = path.resolve(param);
      const filePath = fs.existsSync(distPath) ? distPath : rootPath;
      let html = await fs.promises.readFile(filePath, 'utf-8');
      const nonce = res.locals.cspNonce;
      if (nonce) {
        // Inject nonce into script tags that do not already have one
        html = html.replace(/<script(?![^>]*\bnonce=)([^>]*)>/gi, `<script nonce="${nonce}"$1>`);
      }
      res.setHeader('Content-Type', 'text/html; charset=utf-8');
      res.setHeader('Cache-Control', 'no-cache, must-revalidate');
      return res.send(html);
    } catch (err) {
      return next(err);
    }
  }
  next();
});

// Serve compiled dist bundle assets if available (excluding index.html so dynamic nonce injection applies)
if (fs.existsSync(path.resolve('dist'))) {
  app.use(express.static('dist', {
    index: false,
    maxAge: '1y',
    etag: true
  }));
}

// Serve public directory assets
app.use(express.static('public', { maxAge: '30d', etag: true }));
app.use('/src', (req, res, next) => {
  if (req.path.startsWith('/server') || req.path.includes('/server/')) {
    return res.status(404).json({ success: false, error: 'Resource not found' });
  }
  next();
}, express.static('src', { maxAge: '0' }));

// 10. Global 404 Route Handler for undefined endpoints
app.use((req, res, next) => {
  if (req.path.startsWith('/api')) {
    return res.status(404).json({
      success: false,
      error: `API route not found: ${req.method} ${req.originalUrl}`
    });
  }
  res.status(404).sendFile(path.resolve('index.html'));
});

// 11. Global Error Handler Middleware
app.use((err, req, res, next) => {
  if (err.message && err.message.includes('CORS Policy')) {
    return res.status(403).json({ success: false, error: err.message });
  }
  console.error('Unhandled Server Error:', err);
  res.status(err.status || 500).json({
    success: false,
    error: process.env.NODE_ENV === 'production' 
      ? 'An unexpected internal server error occurred.' 
      : (err.message || 'Internal Server Error')
  });
});

// 12. Startup Sequence & Server Listen
if (process.env.NODE_ENV !== 'test') {
  initPostgresTables().then(() => {
    app.listen(PORT, () => {
      console.log(`✨ mingmorsels Artisanal API running securely at http://localhost:${PORT}`);
      console.log(`🔒 Security: Hardened Authentication Active, Strict HMAC Verification, Static Protection Enabled.`);
    });
  }).catch((err) => {
    console.error('Database connection error during boot:', err);
    app.listen(PORT, () => {
      console.log(`✨ mingmorsels Artisanal API running in fallback mode at http://localhost:${PORT}`);
    });
  });
}
