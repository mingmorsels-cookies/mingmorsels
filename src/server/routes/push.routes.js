import express from 'express';
import webpush from 'web-push';
import pool from '../../../db.js';
import { verifyAdminAuth } from './admin.routes.js';

const router = express.Router();

// Initialize web-push in server.js, but we can set details here if needed.
// However, the keys should be set globally where process.env.VAPID_PUBLIC_KEY is available.

// GET /api/push/public-key
// Returns the public key to the frontend for subscription
router.get('/api/push/public-key', (req, res) => {
  res.json({ publicKey: process.env.VAPID_PUBLIC_KEY });
});

// POST /api/push/subscribe
// Saves the subscription to the database
router.post('/api/push/subscribe', async (req, res) => {
  const subscription = req.body;

  if (!subscription || !subscription.endpoint || !subscription.keys) {
    return res.status(400).json({ error: 'Invalid subscription object' });
  }

  try {
    const { endpoint, keys: { auth, p256dh } } = subscription;
    
    // Insert or update (upsert) the subscription based on endpoint
    await pool.query(`
      INSERT INTO push_subscriptions (endpoint, keys_auth, keys_p256dh)
      VALUES ($1, $2, $3)
      ON CONFLICT (endpoint) 
      DO UPDATE SET keys_auth = EXCLUDED.keys_auth, keys_p256dh = EXCLUDED.keys_p256dh
    `, [endpoint, auth, p256dh]);

    res.status(201).json({ success: true, message: 'Subscription saved.' });
  } catch (error) {
    console.error('Error saving push subscription:', error);
    res.status(500).json({ error: 'Database error' });
  }
});

// POST /api/admin/push/broadcast
// Sends a notification to all subscribers
router.post('/api/admin/push/broadcast', verifyAdminAuth, async (req, res) => {
  const { title, body, url } = req.body;

  if (!title || !body) {
    return res.status(400).json({ error: 'Title and body are required' });
  }

  try {
    const result = await pool.query('SELECT endpoint, keys_auth, keys_p256dh FROM push_subscriptions');
    const subscriptions = result.rows;

    const payload = JSON.stringify({
      title,
      body,
      url: url || '/'
    });

    let successCount = 0;
    let failCount = 0;

    // Send notifications in parallel
    const sendPromises = subscriptions.map(async (sub) => {
      const pushSubscription = {
        endpoint: sub.endpoint,
        keys: {
          auth: sub.keys_auth,
          p256dh: sub.keys_p256dh
        }
      };

      try {
        await webpush.sendNotification(pushSubscription, payload);
        successCount++;
      } catch (err) {
        // If the subscription is gone (e.g. 410 Gone), remove it from the database
        if (err.statusCode === 410 || err.statusCode === 404) {
          await pool.query('DELETE FROM push_subscriptions WHERE endpoint = $1', [sub.endpoint]);
        }
        failCount++;
        console.error('Error sending push notification to endpoint:', sub.endpoint, err.message);
      }
    });

    await Promise.all(sendPromises);

    res.json({
      success: true,
      message: `Broadcast complete. Sent: ${successCount}, Failed/Removed: ${failCount}`
    });
  } catch (error) {
    console.error('Broadcast error:', error);
    res.status(500).json({ error: 'Failed to broadcast notifications' });
  }
});

export default router;
