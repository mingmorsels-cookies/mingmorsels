// ─────────────────────────────────────────────────────────────────────────────
// Ming Morsels - Production-Grade Express API Server
// ─────────────────────────────────────────────────────────────────────────────

import dotenv from 'dotenv';
dotenv.config();

import express from 'express';
import cors from 'cors';
import helmet from 'helmet';

// Database initialization
import { initPostgresTables } from './db.js';

// Modular Route Handlers
import orderRoutes from './src/server/routes/order.routes.js';
import adminRoutes from './src/server/routes/admin.routes.js';
import pincodeRoutes from './src/server/routes/pincode.routes.js';
import analyticsRoutes from './src/server/routes/analytics.routes.js';
import reviewRoutes from './src/server/routes/review.routes.js';
import { createRateLimiter } from './src/server/middleware/rateLimiter.js';
import { structuredLogger } from './src/server/middleware/logger.js';

export const app = express();
const PORT = process.env.PORT || 5001;

// 1. Structured JSON Request Logger & Tracing
app.use(structuredLogger());

// 2. Security Headers via Helmet with Custom CSP (Clickjacking & Injection Protection)
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", "'unsafe-inline'", "'unsafe-eval'", "https://checkout.razorpay.com", "https://accounts.google.com", "https://apis.google.com", "https://www.gstatic.com", "https://cdnjs.cloudflare.com", "blob:"],
      scriptSrcAttr: ["'unsafe-inline'"],
      styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
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
  crossOriginEmbedderPolicy: false,
  crossOriginOpenerPolicy: false,
  crossOriginResourcePolicy: false,
  frameguard: { action: 'deny' }
}));

// 2. CORS Whitelist Configuration
const ALLOWED_ORIGINS = [
  'http://localhost:5173',
  'http://127.0.0.1:5173',
  'http://localhost:5001',
  'http://127.0.0.1:5001',
  'https://mingmorsels.com',
  'https://www.mingmorsels.com'
];

app.use(cors({
  origin: (origin, callback) => {
    // Allow non-browser requests or matching origins
    if (!origin || ALLOWED_ORIGINS.includes(origin) || origin.endsWith('.railway.app')) {
      return callback(null, true);
    }
    return callback(new Error('CORS Policy: Request from unauthorized origin blocked.'));
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'x-admin-key', 'x-razorpay-signature']
}));

// 3. Body Parsing Middleware with Raw Body Buffer Capture for Webhooks
app.use(express.json({
  limit: '2mb',
  verify: (req, res, buf) => {
    req.rawBody = buf;
  }
}));
app.use(express.urlencoded({ extended: true, limit: '2mb' }));

// 4. Rate Limiting Protection (Sliding Window)
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

// 5. Health Check Endpoint
app.get('/api/health', (req, res) => {
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    service: 'Ming Morsels Artisanal Confectionery API',
    environment: process.env.NODE_ENV || 'development'
  });
});

// 6. Static File Serving with Production Caching Headers
app.use(express.static('dist', {
  maxAge: '1y',
  immutable: true,
  etag: true,
  setHeaders: (res, filePath) => {
    if (filePath.endsWith('.html')) {
      res.setHeader('Cache-Control', 'no-cache, must-revalidate');
    }
  }
}));
app.use('/public', express.static('public', { maxAge: '30d', etag: true }));

// 7. Mount Modular API Routers
app.use('/api', orderRoutes);
app.use('/api', adminRoutes);
app.use('/api', pincodeRoutes);
app.use('/api', analyticsRoutes);
app.use('/api', reviewRoutes);

// 8. Global 404 Route Handler for undefined endpoints
app.use((req, res, next) => {
  if (req.path.startsWith('/api')) {
    return res.status(404).json({
      success: false,
      error: `API route not found: ${req.method} ${req.originalUrl}`
    });
  }
  next();
});

// 8. Global Error Handler Middleware
app.use((err, req, res, next) => {
  console.error('Unhandled Server Error:', err);
  res.status(err.status || 500).json({
    success: false,
    error: process.env.NODE_ENV === 'production' 
      ? 'An unexpected internal server error occurred.' 
      : (err.message || 'Internal Server Error')
  });
});

// 9. Startup Sequence & Server Listen
if (process.env.NODE_ENV !== 'test') {
  initPostgresTables().then(() => {
    app.listen(PORT, () => {
      console.log(`✨ Ming Morsels Artisanal API running securely at http://localhost:${PORT}`);
      console.log(`🔒 Security: Admin Auth Active, Strict HMAC Verification Enabled, Rate Limiting Active.`);
    });
  }).catch((err) => {
    console.error('Database connection error during boot:', err);
    app.listen(PORT, () => {
      console.log(`✨ Ming Morsels Artisanal API running in fallback mode at http://localhost:${PORT}`);
    });
  });
}
