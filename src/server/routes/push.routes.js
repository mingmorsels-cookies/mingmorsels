import express from 'express';
import webpush from 'web-push';
import { pgPool, readLocalStoreAsync, writeLocalStoreAsync } from '../../../db.js';
import { verifyAdminAuth } from '../middleware/auth.js';

const router = express.Router();

// GET /api/push/public-key — Returns VAPID public key to frontend
router.get(['/api/push/public-key', '/push/public-key'], (req, res) => {
  res.json({ publicKey: process.env.VAPID_PUBLIC_KEY || '' });
});

// POST /api/push/subscribe — Saves push subscription with optional customer identifier
router.post(['/api/push/subscribe', '/push/subscribe'], async (req, res) => {
  const { subscription, customer_phone, customer_email } = req.body;
  const sub = subscription || req.body;

  if (!sub || !sub.endpoint || !sub.keys) {
    return res.status(400).json({ error: 'Invalid subscription object' });
  }

  try {
    const { endpoint, keys: { auth, p256dh } } = sub;
    const phone = (customer_phone || '').replace(/\D/g, '').slice(-10) || null;
    const email = customer_email || null;

    if (pgPool) {
      try {
        await pgPool.query(`
          INSERT INTO push_subscriptions (endpoint, keys_auth, keys_p256dh, customer_phone, customer_email)
          VALUES ($1, $2, $3, $4, $5)
          ON CONFLICT (endpoint) 
          DO UPDATE SET keys_auth = EXCLUDED.keys_auth, keys_p256dh = EXCLUDED.keys_p256dh,
            customer_phone = COALESCE(EXCLUDED.customer_phone, push_subscriptions.customer_phone),
            customer_email = COALESCE(EXCLUDED.customer_email, push_subscriptions.customer_email)
        `, [endpoint, auth, p256dh, phone, email]);
      } catch (schemaErr) {
        try {
          await pgPool.query(`
            INSERT INTO push_subscriptions (endpoint, keys_auth, keys_p256dh)
            VALUES ($1, $2, $3)
            ON CONFLICT (endpoint) 
            DO UPDATE SET keys_auth = EXCLUDED.keys_auth, keys_p256dh = EXCLUDED.keys_p256dh
          `, [endpoint, auth, p256dh]);
        } catch (e) {}
      }
    }

    // Mirror to local store fallback
    const store = await readLocalStoreAsync();
    store.push_subscriptions = store.push_subscriptions || [];
    const existingIdx = store.push_subscriptions.findIndex(s => s.endpoint === endpoint);
    const subObj = { endpoint, keys_auth: auth, keys_p256dh: p256dh, customer_phone: phone, customer_email: email, updated_at: new Date().toISOString() };
    if (existingIdx >= 0) {
      store.push_subscriptions[existingIdx] = subObj;
    } else {
      store.push_subscriptions.push(subObj);
    }
    await writeLocalStoreAsync(store);

    res.status(201).json({ success: true, message: 'Subscription saved.' });
  } catch (error) {
    console.error('Error saving push subscription:', error);
    res.status(500).json({ error: 'Database error: ' + error.message });
  }
});

/**
 * Sends a browser push notification to a specific customer by phone or email.
 * Called internally after order placement.
 */
export async function sendPushToCustomer({ phone, email, title, body, url, orderId }) {
  try {
    const cleanPhone = (phone || '').replace(/\D/g, '').slice(-10);
    let subs = [];

    if (pgPool) {
      try {
        if (cleanPhone && cleanPhone.length === 10) {
          const result = await pgPool.query(
            'SELECT endpoint, keys_auth, keys_p256dh FROM push_subscriptions WHERE customer_phone = $1',
            [cleanPhone]
          );
          subs = result.rows || [];
        }
        if (subs.length === 0 && email) {
          const result = await pgPool.query(
            'SELECT endpoint, keys_auth, keys_p256dh FROM push_subscriptions WHERE customer_email = $1',
            [email]
          );
          subs = result.rows || [];
        }
      } catch (e) {}
    }

    if (subs.length === 0) {
      const store = await readLocalStoreAsync();
      subs = (store.push_subscriptions || []).filter(s => 
        (cleanPhone && s.customer_phone === cleanPhone) || 
        (email && s.customer_email === email)
      );
    }

    if (subs.length === 0) return;

    const payload = JSON.stringify({
      title: title || 'Ming Morsels 🍪',
      body: body || 'Your order has been confirmed!',
      url: url || '/order-confirmation.html',
      orderId
    });

    for (const sub of subs) {
      try {
        await webpush.sendNotification(
          { endpoint: sub.endpoint, keys: { auth: sub.keys_auth, p256dh: sub.keys_p256dh } },
          payload
        );
      } catch (err) {}
    }
  } catch (err) {
    console.warn('[Push] sendPushToCustomer error:', err.message);
  }
}

// POST /api/admin/push/broadcast — Sends notification to ALL subscribers (admin only)
router.post(['/api/admin/push/broadcast', '/admin/push/broadcast'], verifyAdminAuth, async (req, res) => {
  const { title, body, url } = req.body;
  if (!title || !body) return res.status(400).json({ error: 'Title and body are required' });

  try {
    let subscriptions = [];

    if (pgPool) {
      try {
        const result = await pgPool.query('SELECT endpoint, keys_auth, keys_p256dh FROM push_subscriptions');
        subscriptions = result.rows || [];
      } catch (e) {}
    }

    if (subscriptions.length === 0) {
      const store = await readLocalStoreAsync();
      subscriptions = store.push_subscriptions || [];
    }

    if (subscriptions.length === 0) {
      return res.json({ 
        success: true, 
        message: '📢 Broadcast triggered! (Currently 0 active browser subscribers registered on device. Notifications will be delivered as new visitors subscribe).' 
      });
    }

    const payload = JSON.stringify({ 
      title, 
      body, 
      url: url || '/' 
    });

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
          if (pgPool) {
            try { await pgPool.query('DELETE FROM push_subscriptions WHERE endpoint = $1', [sub.endpoint]); } catch(e) {}
          }
        }
        failCount++;
      }
    }));

    res.json({ 
      success: true, 
      message: `✅ Broadcast complete! Sent: ${successCount} notification(s), Inactive: ${failCount}` 
    });
  } catch (error) {
    console.error('Broadcast error:', error);
    res.status(500).json({ error: 'Failed to broadcast notifications: ' + error.message });
  }
});

export default router;
