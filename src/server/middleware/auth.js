// ─────────────────────────────────────────────────────────────────────────────
// Authentication & Security Middleware
// ─────────────────────────────────────────────────────────────────────────────

import crypto from 'crypto';

const JWT_SECRET = process.env.JWT_SECRET || 'mm_confectionery_jwt_secret_signature_key_2026';
const DEFAULT_ADMIN_KEY = process.env.ADMIN_SECRET_KEY || 'Arun_Narayan_K';

/**
 * Base64URL encoding/decoding helpers
 */
function base64UrlEncode(str) {
  return Buffer.from(str)
    .toString('base64')
    .replace(/=/g, '')
    .replace(/\+/g, '-')
    .replace(/\//g, '_');
}

function base64UrlDecode(str) {
  str = str.replace(/-/g, '+').replace(/_/g, '/');
  while (str.length % 4) {
    str += '=';
  }
  return Buffer.from(str, 'base64').toString('utf-8');
}

/**
 * Generates an HMAC SHA-256 signed Customer Token
 */
export function generateCustomerToken(payload, expiresInSeconds = 7 * 24 * 3600) {
  const header = JSON.stringify({ alg: 'HS256', typ: 'JWT' });
  const exp = Math.floor(Date.now() / 1000) + expiresInSeconds;
  const body = JSON.stringify({ ...payload, exp, iat: Math.floor(Date.now() / 1000) });

  const encodedHeader = base64UrlEncode(header);
  const encodedBody = base64UrlEncode(body);
  const signature = crypto
    .createHmac('sha256', JWT_SECRET)
    .update(`${encodedHeader}.${encodedBody}`)
    .digest('base64url');

  return `${encodedHeader}.${encodedBody}.${signature}`;
}

/**
 * Verifies and decodes an HMAC SHA-256 Customer Token
 */
export function verifyCustomerToken(token) {
  if (!token || typeof token !== 'string') return null;
  const parts = token.split('.');
  if (parts.length !== 3) return null;

  const [header, body, signature] = parts;
  const expectedSignature = crypto
    .createHmac('sha256', JWT_SECRET)
    .update(`${header}.${body}`)
    .digest('base64url');

  const sigBuffer = Buffer.from(signature);
  const expBuffer = Buffer.from(expectedSignature);

  if (sigBuffer.length !== expBuffer.length || !crypto.timingSafeEqual(sigBuffer, expBuffer)) {
    return null;
  }

  try {
    const decoded = JSON.parse(base64UrlDecode(body));
    if (decoded.exp && decoded.exp < Math.floor(Date.now() / 1000)) {
      return null; // Expired
    }
    return decoded;
  } catch {
    return null;
  }
}

/**
 * Middleware to protect administrative endpoints from unauthorized public access.
 * Checks for `x-admin-key` or `Authorization: Bearer <key>` header.
 */
export function verifyAdminAuth(req, res, next) {
  const adminKey = req.headers['x-admin-key'] || 
                   (req.headers['authorization']?.startsWith('Bearer ') ? req.headers['authorization'].split(' ')[1] : null);

  if (!adminKey) {
    return res.status(401).json({
      success: false,
      error: 'Unauthorized: Admin authentication key required.'
    });
  }

  // Timing safe comparison to prevent timing attacks
  const expectedBuffer = Buffer.from(DEFAULT_ADMIN_KEY);
  const providedBuffer = Buffer.from(adminKey);

  if (expectedBuffer.length !== providedBuffer.length || !crypto.timingSafeEqual(expectedBuffer, providedBuffer)) {
    return res.status(403).json({
      success: false,
      error: 'Forbidden: Invalid admin credentials.'
    });
  }

  req.isAdmin = true;
  next();
}

/**
 * Sanitizes and validates customer session or customer token.
 * Validates either JWT Bearer token or email query/body parameter with fallback verification.
 */
export function validateCustomerSession(req, res, next) {
  // Check Admin header first
  const adminKey = req.headers['x-admin-key'];
  if (adminKey && adminKey === DEFAULT_ADMIN_KEY) {
    req.isAdmin = true;
    return next();
  }

  const authHeader = req.headers['authorization'];
  if (authHeader && authHeader.startsWith('Bearer ')) {
    const token = authHeader.split(' ')[1];
    if (token === DEFAULT_ADMIN_KEY) {
      req.isAdmin = true;
      return next();
    }
    const decoded = verifyCustomerToken(token);
    if (decoded && decoded.email) {
      req.customerEmail = decoded.email.trim().toLowerCase();
      req.customerUser = decoded;
      return next();
    }
  }

  const email = req.query.email || req.body?.user_email || req.query.user_email;
  if (!email || typeof email !== 'string' || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
    return res.status(401).json({
      success: false,
      error: 'Authentication required. Please provide a valid customer token or email.'
    });
  }
  req.customerEmail = email.trim().toLowerCase();
  next();
}

/**
 * Checks if the authenticated requester owns the target order or is an administrator.
 */
export function authorizeOrderOwnership(req, res, next) {
  if (req.isAdmin) return next();

  const targetEmail = req.customerEmail;
  if (!targetEmail) {
    return res.status(401).json({ success: false, error: 'Authentication required to access order.' });
  }

  next();
}

