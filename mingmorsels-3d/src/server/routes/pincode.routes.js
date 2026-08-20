// ─────────────────────────────────────────────────────────────────────────────
// Pincode Serviceability Route
// ─────────────────────────────────────────────────────────────────────────────

import { Router } from 'express';
import { checkPincodeServiceable } from '../../../db.js';
import { getCache, setCache } from '../../../redis.js';

const router = Router();

router.get('/pincode/check', async (req, res) => {
  try {
    const { pincode } = req.query;
    if (!pincode || !/^\d{6}$/.test(pincode)) {
      return res.status(400).json({
        serviceable: false,
        error: 'Please provide a valid 6-digit Indian PIN code.'
      });
    }

    const cacheKey = `pincode:${pincode}`;
    const cached = await getCache(cacheKey);
    if (cached) {
      return res.json(cached);
    }

    const result = await checkPincodeServiceable(pincode);
    await setCache(cacheKey, result, 3600); // 1 hour TTL

    res.json(result);
  } catch (err) {
    console.error('Pincode check error:', err);
    res.status(500).json({ serviceable: false, error: 'Failed to verify PIN code.' });
  }
});

// Legacy redirect for backward compatibility
router.get('/check-pincode', (req, res) => {
  res.redirect(307, `/api/pincode/check?${new URLSearchParams(req.query)}`);
});

export default router;
