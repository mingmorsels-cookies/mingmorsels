import express from 'express';
import webpush from 'web-push';
import { pgPool } from '../../../db.js';
import { verifyAdminAuth } from '../middleware/auth.js';

const router = express.Router();

// GET /api/push/public-key — Returns VAPID public key to frontend
router.get('/api/push/public-key', (req, res) => {
  res.json({ publicKey: process.env.VAPID_PUBLIC_KEY });
});

// POST /api/push/subscribe — Saves push subscription with optional customer identifier
router.post('/api/push/subscribe', async (req, res) => {
  const { subscription, customer_phone, customer_email } = req.body;
  const sub = subscription || req.body;

  if (!sub || !sub.endpoint || !sub.keys) {
    return res.status(400).json({ error: 'Invalid subscription object' });
  }

  try {
    const { endpoint, keys: { auth, p256dh } } = sub;
    const phone = (customer_phone || '').replace(/\D/g, '').slice(-10) || null;
    const email = customer_email || null;

    if (!pgPool) throw new Error('Database not connected');

    try {
      // Try to save with customer identifier columns (newer schema)
      await pgPool.query(`
        INSERT INTO push_subscriptions (endpoint, keys_auth, keys_p256dh, customer_phone, customer_email)
        VALUES ($1, $2, $3, $4, $5)
        ON CONFLICT (endpoint) 
        DO UPDATE SET keys_auth = EXCLUDED.keys_auth, keys_p256dh = EXCLUDED.keys_p256dh,
          customer_phone = COALESCE(EXCLUDED.customer_phone, push_subscriptions.customer_phone),
          customer_email = COALESCE(EXCLUDED.customer_email, push_subscriptions.customer_email)
      `, [endpoint, auth, p256dh, phone, email]);
    } catch (schemaErr) {
      // Fallback for older schema without customer columns
      await pgPool.query(`
        INSERT INTO push_subscriptions (endpoint, keys_auth, keys_p256dh)
        VALUES ($1, $2, $3)
        ON CONFLICT (endpoint) 
        DO UPDATE SET keys_auth = EXCLUDED.keys_auth, keys_p256dh = EXCLUDED.keys_p256dh
      `, [endpoint, auth, p256dh]);
    }

    res.status(201).json({ success: true, message: 'Subscription saved.' });
  } catch (error) {
    console.error('Error saving push subscription:', error);
    res.status(500).json({ error: 'Database error' });
  }
});

/**
 * Sends a browser push notification to a specific customer by phone or email.
 * Called internally after order placement.
 */
export async function sendPushToCustomer({ phone, email, title, body, url, orderId }) {
  if (!pgPool) return;
  try {
    const cleanPhone = (phone || '').replace(/\D/g, '').slice(-10);
    let result;

    if (cleanPhone && cleanPhone.length === 10) {
      result = await pgPool.query(
        'SELECT endpoint, keys_auth, keys_p256dh FROM push_subscriptions WHERE customer_phone = $1',
        [cleanPhone]
      );
    }
    if ((!result || result.rows.length === 0) && email) {
      result = await pgPool.query(
        'SELECT endpoint, keys_auth, keys_p256dh FROM push_subscriptions WHERE customer_email = $1',
        [email]
      );
    }
    if (!result || result.rows.length === 0) return;

    const payload = JSON.stringify({
      title: title || 'Ming Morsels 🍪',
      body: body || 'Your order has been confirmed!',
      url: url || '/order-confirmation.html',
      orderId
    });

    for (const sub of result.rows) {
      try {
        await webpush.sendNotification(
          { endpoint: sub.endpoint, keys: { auth: sub.keys_auth, p256dh: sub.keys_p256dh } },
          payload
        );
        console.log(`🔔 [Push] Notification sent to customer (${cleanPhone || email})`);
      } catch (err) {
        if (err.statusCode === 410 || err.statusCode === 404) {
          await pgPool.query('DELETE FROM push_subscriptions WHERE endpoint = $1', [sub.endpoint]);
        }
      }
    }
  } catch (err) {
    console.warn('[Push] sendPushToCustomer error:', err.message);
  }
}

// POST /api/admin/push/broadcast — Sends notification to ALL subscribers (admin only)
router.post('/api/admin/push/broadcast', verifyAdminAuth, async (req, res) => {
  const { title, body, url } = req.body;
  if (!title || !body) return res.status(400).json({ error: 'Title and body are required' });

  try {
    if (!pgPool) throw new Error('Database not connected');
    const result = await pgPool.query('SELECT endpoint, keys_auth, keys_p256dh FROM push_subscriptions');
    const subscriptions = result.rows;
    const payload = JSON.stringify({ title, body, url: url || '/' });

    let successCount = 0;
    let failCount = 0;

    await Promise.all(subscriptions.map(async (sub) => {
      try {
        await webpush.sendNotification(
          { endpoint: sub.endpoint, keys: { auth: sub.keys_auth, p256dh: sub.keys_p256dh } },
          payload
        );
        successCount++;
      } catch (err) {
        if (err.statusCode === 410 || err.statusCode === 404) {
          if (pgPool) await pgPool.query('DELETE FROM push_subscriptions WHERE endpoint = $1', [sub.endpoint]);
        }
        failCount++;
      }
    }));

    res.json({ success: true, message: `Broadcast complete. Sent: ${successCount}, Failed/Removed: ${failCount}` });
  } catch (error) {
    console.error('Broadcast error:', error);
    res.status(500).json({ error: 'Failed to broadcast notifications' });
  }
});

export default router;
