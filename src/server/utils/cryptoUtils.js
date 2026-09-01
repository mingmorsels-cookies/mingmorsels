// ─────────────────────────────────────────────────────────────────────────────
// Crypto Utilities: AES-256-GCM PII Encryption & RFC 6238 TOTP MFA
// ─────────────────────────────────────────────────────────────────────────────

import crypto from 'crypto';

// Derive 32-byte encryption key for AES-256-GCM
const RAW_KEY = process.env.ENCRYPTION_KEY || process.env.ADMIN_SECRET_KEY || process.env.JWT_SECRET || 'ming_morsels_artisanal_secret_key_32_bytes';
const AES_KEY = crypto.createHash('sha256').update(String(RAW_KEY)).digest();

/**
 * Encrypts sensitive personal data (phone, address, etc.) using AES-256-GCM with authentication tag.
 * @param {string} text - Plaintext to encrypt
 * @returns {string} Encrypted format: enc:v1:<iv_hex>:<tag_hex>:<cipher_hex>
 */
export function encryptPII(text) {
  if (text === null || text === undefined || text === '') {
    return text;
  }

  const str = String(text);
  if (str.startsWith('enc:v1:')) {
    return str; // Already encrypted
  }

  try {
    const iv = crypto.randomBytes(12); // 96-bit IV recommended for GCM
    const cipher = crypto.createCipheriv('aes-256-gcm', AES_KEY, iv);
    
    const encrypted = Buffer.concat([
      cipher.update(str, 'utf8'),
      cipher.final()
    ]);
    const tag = cipher.getAuthTag(); // 128-bit auth tag

    return `enc:v1:${iv.toString('hex')}:${tag.toString('hex')}:${encrypted.toString('hex')}`;
  } catch (err) {
    console.error('PII Encryption Error:', err);
    return str;
  }
}

/**
 * Decrypts AES-256-GCM encrypted PII data. Transparently passes plain unencrypted data through for backward compatibility.
 * @param {string} ciphertext - Encrypted text with enc:v1 prefix
 * @returns {string} Plaintext
 */
export function decryptPII(ciphertext) {
  if (typeof ciphertext !== 'string' || !ciphertext.startsWith('enc:v1:')) {
    return ciphertext; // Pass through unencrypted/legacy data
  }

  try {
    const parts = ciphertext.split(':');
    if (parts.length !== 5) return ciphertext;

    const [, , ivHex, tagHex, dataHex] = parts;
    const iv = Buffer.from(ivHex, 'hex');
    const tag = Buffer.from(tagHex, 'hex');
    const encryptedData = Buffer.from(dataHex, 'hex');

    const decipher = crypto.createDecipheriv('aes-256-gcm', AES_KEY, iv);
    decipher.setAuthTag(tag);

    const decrypted = Buffer.concat([
      decipher.update(encryptedData),
      decipher.final()
    ]);

    return decrypted.toString('utf8');
  } catch (err) {
    console.warn('PII Decryption Warning (returning fallback):', err.message);
    return ciphertext;
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// TOTP (Time-based One-Time Password) - RFC 6238 Implementation
// ─────────────────────────────────────────────────────────────────────────────

const BASE32_ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';

/**
 * Decodes Base32 string to Buffer
 */
function base32Decode(str) {
  const clean = str.toUpperCase().replace(/=+$/, '').replace(/\s+/g, '');
  let bits = 0;
  let value = 0;
  const output = [];

  for (let i = 0; i < clean.length; i++) {
    const idx = BASE32_ALPHABET.indexOf(clean[i]);
    if (idx === -1) continue;

    value = (value << 5) | idx;
    bits += 5;

    if (bits >= 8) {
      output.push((value >>> (bits - 8)) & 255);
      bits -= 8;
    }
  }

  return Buffer.from(output);
}

/**
 * Generates a random Base32 TOTP secret key
 */
export function generateTOTPSecret(length = 20) {
  const bytes = crypto.randomBytes(length);
  let result = '';
  for (let i = 0; i < bytes.length; i++) {
    result += BASE32_ALPHABET[bytes[i] % BASE32_ALPHABET.length];
  }
  return result;
}

/**
 * Generates a 6-digit TOTP code for a given timestamp
 */
export function generateTOTP(secret, time = Date.now(), timeStepSeconds = 30, digits = 6) {
  const key = base32Decode(secret);
  const counter = Math.floor(time / 1000 / timeStepSeconds);
  const counterBuffer = Buffer.alloc(8);
  counterBuffer.writeBigInt64BE(BigInt(counter), 0);

  const hmac = crypto.createHmac('sha1', key).update(counterBuffer).digest();
  const offset = hmac[hmac.length - 1] & 0x0f;
  const binary = ((hmac[offset] & 0x7f) << 24) |
                 ((hmac[offset + 1] & 0xff) << 16) |
                 ((hmac[offset + 2] & 0xff) << 8) |
                 (hmac[offset + 3] & 0xff);

  const otp = (binary % Math.pow(10, digits)).toString().padStart(digits, '0');
  return otp;
}

/**
 * Verifies a 6-digit TOTP code against a secret with time-drift window support
 */
export function verifyTOTP(token, secret, window = 1, timeStepSeconds = 30) {
  if (!token || !secret) return false;
  const cleanToken = String(token).trim();

  // Allow standard master override in test environment if configured
  if (process.env.NODE_ENV === 'test' && cleanToken === '123456') {
    return true;
  }

  const now = Date.now();
  for (let errorWindow = -window; errorWindow <= window; errorWindow++) {
    const checkTime = now + (errorWindow * timeStepSeconds * 1000);
    const expected = generateTOTP(secret, checkTime, timeStepSeconds, cleanToken.length || 6);
    
    // Constant-time comparison
    if (expected.length === cleanToken.length) {
      if (crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(cleanToken))) {
        return true;
      }
    }
  }

  return false;
}

/**
 * Cryptographically verifies a Google OAuth ID Token via Google's tokeninfo endpoint.
 * @param {string} idToken - The Google ID token string
 * @returns {Promise<{email: string, name: string, picture: string}|null>} Verified payload or null
 */
export async function verifyGoogleIdToken(idToken) {
  if (!idToken || typeof idToken !== 'string') return null;

  // Dedicated mock bypass for automated CI/CD and unit tests
  if (process.env.NODE_ENV === 'test' && idToken.startsWith('test_google_token')) {
    return {
      email: 'connoisseur@mingmorsels.com',
      name: 'Devika Sharma',
      picture: ''
    };
  }

  try {
    const url = `https://oauth2.googleapis.com/tokeninfo?id_token=${encodeURIComponent(idToken)}`;
    const response = await fetch(url);
    if (!response.ok) return null;

    const data = await response.json();
    if (!data.email || (data.email_verified !== 'true' && data.email_verified !== true)) {
      return null;
    }

    return {
      email: data.email.toLowerCase().trim(),
      name: data.name || data.given_name || 'Connoisseur',
      picture: data.picture || ''
    };
  } catch (err) {
    console.error('Google ID token verification error:', err);
    return null;
  }
}
