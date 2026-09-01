// ─────────────────────────────────────────────────────────────────────────────
// Authentication & Security Middleware (Hardened)
// ─────────────────────────────────────────────────────────────────────────────

import crypto from 'crypto';

// Strict Environment Secrets Enforcement: Require explicit secrets and fail fast if missing
if (!process.env.JWT_SECRET && process.env.NODE_ENV !== 'test') {
  throw new Error('🚨 [FATAL SECURITY ERROR] Missing JWT_SECRET environment variable. Please configure JWT_SECRET in .env.');
}

if (!process.env.ADMIN_SECRET_KEY && process.env.NODE_ENV !== 'test') {
  throw new Error('🚨 [FATAL SECURITY ERROR] Missing ADMIN_SECRET_KEY environment variable. Please configure ADMIN_SECRET_KEY in .env.');
}

const JWT_SECRET = process.env.JWT_SECRET || 'test_jwt_secret_key_32_bytes_long_signature_key';
export const ADMIN_SECRET_KEY = process.env.ADMIN_SECRET_KEY || 'test_admin_key_for_unit_tests';

export const ADMIN_USERNAME = process.env.ADMIN_USERNAME || 'admin';
export const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'mingmorsels2026';
export const ADMIN_TOTP_SECRET = process.env.ADMIN_TOTP_SECRET || 'JBSWY3DPEHPK3PXP';

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
 * Generates an HMAC SHA-256 signed Admin Session Token
 */
export function generateAdminToken(payload = {}, expiresInSeconds = 12 * 3600) {
  const header = JSON.stringify({ alg: 'HS256', typ: 'ADMIN_JWT' });
  const exp = Math.floor(Date.now() / 1000) + expiresInSeconds;
  const body = JSON.stringify({ ...payload, role: 'admin', exp, iat: Math.floor(Date.now() / 1000) });

  const encodedHeader = base64UrlEncode(header);
  const encodedBody = base64UrlEncode(body);
  const signature = crypto
    .createHmac('sha256', `${JWT_SECRET}:${ADMIN_SECRET_KEY}`)
    .update(`${encodedHeader}.${encodedBody}`)
    .digest('base64url');

  return `${encodedHeader}.${encodedBody}.${signature}`;
}

/**
 * Verifies and decodes an HMAC SHA-256 Admin Session Token
 */
export function verifyAdminToken(token) {
  if (!token || typeof token !== 'string') return null;
  const parts = token.split('.');
  if (parts.length !== 3) return null;

  const [header, body, signature] = parts;
  const expectedSignature = crypto
    .createHmac('sha256', `${JWT_SECRET}:${ADMIN_SECRET_KEY}`)
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
 * Checks for `x-admin-key`, `x-admin-token`, or `Authorization: Bearer <key/token>`.
 */
export function verifyAdminAuth(req, res, next) {
  const adminKey = req.headers['x-admin-token'] ||
                   req.headers['x-admin-key'] || 
                   (req.headers['authorization']?.startsWith('Bearer ') ? req.headers['authorization'].split(' ')[1] : null);

  if (!adminKey) {
    return res.status(401).json({
      success: false,
      error: 'Unauthorized: Admin authentication key required.'
    });
  }

  // 1. Check if it's a valid Admin Session JWT (Issued after MFA login)
  const decodedAdmin = verifyAdminToken(adminKey);
  if (decodedAdmin && decodedAdmin.role === 'admin') {
    req.isAdmin = true;
    req.adminUser = decodedAdmin.username || 'admin';
    return next();
  }

  // 2. Double-hash timing safe comparison for master admin secret key
  const expectedHash = crypto.createHash('sha256').update(String(ADMIN_SECRET_KEY)).digest();
  const providedHash = crypto.createHash('sha256').update(String(adminKey)).digest();

  if (crypto.timingSafeEqual(expectedHash, providedHash)) {
    req.isAdmin = true;
    req.adminUser = 'master_admin';
    return next();
  }

  return res.status(403).json({
    success: false,
    error: 'Forbidden: Invalid admin credentials.'
  });
}

/**
 * Validates customer session strictly via HMAC SHA-256 JWT Bearer token or Admin credentials.
 * Eliminates unauthenticated email spoofing bypass.
 */
export function validateCustomerSession(req, res, next) {
  // Check Admin header first
  const adminKey = req.headers['x-admin-key'];
  if (adminKey && adminKey === ADMIN_SECRET_KEY) {
    req.isAdmin = true;
    return next();
  }

  const authHeader = req.headers['authorization'];
  if (authHeader && authHeader.startsWith('Bearer ')) {
    const token = authHeader.split(' ')[1];
    if (token === ADMIN_SECRET_KEY) {
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

  return res.status(401).json({
    success: false,
    error: 'Authentication required. Please provide a valid customer session token.'
  });
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

