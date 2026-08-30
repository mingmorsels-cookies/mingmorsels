// ─────────────────────────────────────────────────────────────────────────────
// Enterprise Input Sanitizer & Prototype Pollution Defense Middleware
// ─────────────────────────────────────────────────────────────────────────────

const PROHIBITED_KEYS = new Set(['__proto__', 'constructor', 'prototype']);

/**
 * Recursively cleanses an object or array in-place against prototype pollution and null-byte injection.
 * @param {*} value - The input value to clean
 * @returns {*} - The sanitized value
 */
export function deepSanitize(value) {
  if (value === null || value === undefined) {
    return value;
  }

  if (typeof value === 'string') {
    return value.replace(/\0/g, '').trim();
  }

  if (Array.isArray(value)) {
    for (let i = 0; i < value.length; i++) {
      value[i] = deepSanitize(value[i]);
    }
    return value;
  }

  if (typeof value === 'object') {
    for (const key of Object.keys(value)) {
      if (PROHIBITED_KEYS.has(key.toLowerCase())) {
        console.warn(`🚨 [SECURITY ALERT] Prohibited prototype key '${key}' deleted from incoming request.`);
        delete value[key];
        continue;
      }
      value[key] = deepSanitize(value[key]);
    }
    return value;
  }

  return value;
}

/**
 * Express middleware to automatically cleanse req.body, req.query, and req.params in-place.
 */
export function securitySanitizer() {
  return (req, res, next) => {
    try {
      if (req.body && typeof req.body === 'object') {
        deepSanitize(req.body);
      }
      if (req.query && typeof req.query === 'object') {
        deepSanitize(req.query);
      }
      if (req.params && typeof req.params === 'object') {
        deepSanitize(req.params);
      }
    } catch (err) {
      console.warn('Sanitizer warning:', err);
    }
    next();
  };
}
