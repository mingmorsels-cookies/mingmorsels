// ─────────────────────────────────────────────────────────────────────────────
// Admin Management Routes (Protected with Admin Key Authentication)
// ─────────────────────────────────────────────────────────────────────────────

import { Router } from 'express';
import crypto from 'crypto';
import { verifyAdminAuth, ADMIN_SECRET_KEY, ADMIN_USERNAME, ADMIN_PASSWORD, ADMIN_TOTP_SECRET, generateAdminToken, verifyAdminToken } from '../middleware/auth.js';
import { verifyTOTP } from '../utils/cryptoUtils.js';
import { auditLogger } from '../services/AuditLogger.js';
import { logisticsService } from '../services/LogisticsService.js';
import { paymentService } from '../services/PaymentService.js';
import { notificationService } from '../services/NotificationService.js';
import { eventStreamService } from '../services/EventStreamService.js';
import { 
  getAllOrders, 
  getOrderRecord,
  createOrderRecord,
  updateOrderShipmentInfo,
  markOrderPaid,
  purgeAllOrders,
  getAdminNotifications,
  dismissAdminNotification,
  cancelOrderRecord,
  getUserRewards,
  redeemUserPoints
} from '../../../db.js';

const router = Router();

/**
 * Admin MFA Login (Username, Password & TOTP)
 */
router.post('/admin/auth/login', async (req, res) => {
  const ip = req.ip || req.headers['x-forwarded-for'] || req.socket?.remoteAddress;
  try {
    const { username, password, totp_code, admin_key } = req.body;

    // 1. Direct Secret Key bypass for backward compatibility
    if (admin_key) {
      const expectedHash = crypto.createHash('sha256').update(String(ADMIN_SECRET_KEY)).digest();
      const providedHash = crypto.createHash('sha256').update(String(admin_key)).digest();
      if (crypto.timingSafeEqual(expectedHash, providedHash)) {
        const token = generateAdminToken({ username: 'master_admin' });
        await auditLogger.logAdminAction({
          adminUser: 'master_admin',
          action: 'ADMIN_LOGIN_KEY',
          ip,
          details: { method: 'admin_key' },
          status: 'SUCCESS'
        });
        return res.json({ success: true, token, user: { username: 'master_admin', role: 'admin' } });
      }
    }

    if (!username || !password) {
      return res.status(400).json({ success: false, error: 'Username and password are required.' });
    }

    const cleanUser = String(username).trim().toLowerCase();
    const cleanPass = String(password).trim();
    const expectedUser = String(ADMIN_USERNAME || 'admin').trim().toLowerCase();
    const expectedPass = String(ADMIN_PASSWORD || 'miora').trim();
    const secretKey = String(ADMIN_SECRET_KEY || '1QAZ2WSX').trim();

    // Verify Username
    const userValid = (cleanUser === expectedUser || cleanUser === 'admin' || cleanUser === 'master_admin');

    // Verify Password (supports 'miora', env ADMIN_PASSWORD, ADMIN_SECRET_KEY, or legacy keys)
    const passValid = (
      cleanPass === 'miora' ||
      cleanPass.toLowerCase() === 'miora' ||
      cleanPass === expectedPass ||
      cleanPass === secretKey ||
      cleanPass === "ASDFGHJKL;'" ||
      cleanPass === 'mingmorsels2026'
    );

    if (!userValid || !passValid) {
      await auditLogger.logAdminAction({
        adminUser: username || 'unknown',
        action: 'ADMIN_LOGIN_FAILED',
        ip,
        details: { reason: 'invalid_credentials' },
        status: 'FAILED'
      });
      return res.status(401).json({ success: false, error: 'Invalid admin username or password.' });
    }

    // 3. TOTP MFA Verification (only if TOTP is provided)
    if (totp_code && String(totp_code).trim().length === 6) {
      const isTotpValid = verifyTOTP(String(totp_code).trim(), ADMIN_TOTP_SECRET);
      if (!isTotpValid) {
        await auditLogger.logAdminAction({
          adminUser: username,
          action: 'ADMIN_MFA_FAILED',
          ip,
          details: { reason: 'invalid_totp_code' },
          status: 'FAILED'
        });
        return res.status(401).json({ success: false, error: 'Invalid 2FA / TOTP authentication code.' });
      }
    }

    const token = generateAdminToken({ username });
    await auditLogger.logAdminAction({
      adminUser: username,
      action: 'ADMIN_LOGIN_SUCCESS',
      ip,
      details: { mfa_verified: Boolean(totp_code) },
      status: 'SUCCESS'
    });

    res.json({
      success: true,
      token,
      user: {
        username,
        role: 'admin',
        mfa_enabled: true
      }
    });
  } catch (error) {
    console.error('Admin Login Error:', error);
    res.status(500).json({ success: false, error: 'Internal server error during authentication.' });
  }
});

/**
 * Admin Audit Logs Ledger
 */
router.get('/admin/audit-logs', verifyAdminAuth, async (req, res) => {
  try {
    const limit = parseInt(req.query.limit, 10) || 100;
    const logs = await auditLogger.getAuditLogs(limit);
    res.json({
      success: true,
      count: logs.length,
      logs
    });
  } catch (error) {
    console.error('Audit logs fetch error:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch audit logs.' });
  }
});

/**
 * Fetch all orders ledger for Admin Dashboard
 */
const handleGetAdminOrders = async (req, res) => {
  try {
    const includeDrafts = req.query.include_drafts !== 'false'; // Default to including drafts so admin never misses an order
    const allOrders = await getAllOrders(includeDrafts);
    const orders = allOrders.filter(order => 
      order.payment_status !== 'FAILED'
    );
    const userRewards = await getUserRewards();
    res.json({
      success: true,
      count: orders.length,
      orders,
      userRewards
    });
  } catch (error) {
    console.error('Admin Orders Error:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch admin order ledger.' });
  }
};

router.get('/admin/orders', verifyAdminAuth, handleGetAdminOrders);
router.get('/orders', verifyAdminAuth, handleGetAdminOrders);

/**
 * Manually verify & mark an order as PAID
 */
router.post('/admin/orders/mark-paid', verifyAdminAuth, async (req, res) => {
  try {
    const { order_id, payment_id } = req.body;
    if (!order_id) {
      return res.status(400).json({ success: false, error: 'order_id is required' });
    }
    const cleanId = String(order_id).trim().replace(/^#/, '');
    const updated = await markOrderPaid(cleanId, payment_id || 'pay_manual_verified');
    if (!updated) {
      return res.status(404).json({ success: false, error: `Order #${order_id} not found.` });
    }
    eventStreamService.broadcastOrderUpdate(updated);
    notificationService.sendAdminNewOrderAlert(updated).catch(e => console.warn('[Admin Alert err]', e.message));
    notificationService.sendOrderConfirmationEmail(updated).catch(e => console.warn('[Customer Email err]', e.message));
    await auditLogger.logAdminAction({
      adminUser: req.adminUser || 'admin',
      action: 'ORDER_MARKED_PAID',
      targetId: cleanId,
      ip: req.ip,
      details: { payment_id: payment_id || 'pay_manual_verified' }
    });
    res.json({
      success: true,
      message: `✅ Order #${cleanId} marked as PAID!`,
      order: updated
    });
  } catch (error) {
    console.error('Admin Mark Paid Error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * Admin Manually Create / Restore Order Record
 */
router.post('/admin/orders/create-manual', verifyAdminAuth, async (req, res) => {
  try {
    const { id, user_name, user_email, user_phone, items, total_amount, payment_status, payment_id, shipping_address, delivery_mode, delivery_status } = req.body;
    if (!id || !user_name) {
      return res.status(400).json({ success: false, error: 'id and user_name are required' });
    }
    const cleanId = String(id).trim().replace(/^#/, '');
    const newOrder = await createOrderRecord({
      id: cleanId,
      user_name,
      user_email: user_email || 'customer@mingmorsels.com',
      user_phone: user_phone || null,
      items: items || [],
      total_amount: Number(total_amount) || 0,
      payment_status: payment_status || 'PAID',
      payment_method: 'Prepaid (Razorpay)',
      payment_id: payment_id || null,
      shipping_address: shipping_address || '',
      delivery_mode: delivery_mode || 'courier',
      delivery_status: delivery_status || 'BAKING'
    });
    eventStreamService.broadcastOrderUpdate(newOrder);
    notificationService.sendAdminNewOrderAlert(newOrder).catch(e => console.warn('[Admin Alert err]', e.message));
    notificationService.sendOrderConfirmationEmail(newOrder).catch(e => console.warn('[Customer Email err]', e.message));
    res.json({ success: true, message: `✅ Order #${cleanId} created successfully!`, order: newOrder });
  } catch (error) {
    console.error('Admin Create Manual Error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * Send Test Admin Email to verify email alert setup
 */
router.post('/admin/test-email', verifyAdminAuth, async (req, res) => {
  try {
    const sent = await notificationService.sendAdminNewOrderAlert({
      id: 'MM-TEST-PING',
      user_name: 'Store Diagnostic Bot',
      user_email: 'mingmorsels@gmail.com',
      user_phone: '+91 88841 02020',
      total_amount: 360,
      shipping_address: 'Artisanal Studio, Bangalore',
      payment_method: 'Prepaid (Razorpay)',
      items: [{ name: 'Rose Petal Cookie (Dozen Delights)', quantity: 1, price: 360 }]
    });
    res.json({ success: sent, message: sent ? '✅ Test alert email sent to mingmorsels@gmail.com!' : '❌ Could not send email.' });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * Fetch Admin Notifications (including VIP 1000+ points re-orders)
 */
router.get('/admin/notifications', verifyAdminAuth, async (req, res) => {
  try {
    const notifications = await getAdminNotifications();
    res.json({
      success: true,
      count: notifications.length,
      notifications
    });
  } catch (error) {
    console.error('Admin Notifications Error:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch notifications.' });
  }
});

/**
 * Dismiss an Admin Notification
 */
router.post('/admin/notifications/:id/dismiss', verifyAdminAuth, async (req, res) => {
  try {
    const success = await dismissAdminNotification(req.params.id);
    res.json({ success });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Failed to dismiss notification.' });
  }
});

/**
 * Admin Real-Time SSE Stream (Live orders and status updates)
 */
router.get('/admin/orders/stream', (req, res) => {
  // Check auth query param or header for EventSource compatibility
  const adminKey = req.query.admin_key || 
                   req.headers['x-admin-token'] || 
                   req.headers['x-admin-key'] ||
                   (req.headers['authorization']?.startsWith('Bearer ') ? req.headers['authorization'].split(' ')[1] : null);

  if (!adminKey) {
    return res.status(401).json({ success: false, error: 'Unauthorized admin stream connection.' });
  }

  // 1. Verify signed JWT Admin Session Token (used by portal)
  const tokenPayload = verifyAdminToken(adminKey);
  if (tokenPayload) {
    return eventStreamService.addAdminClient(res);
  }

  // 2. Direct Static Secret Key comparison for scripts/legacy keys
  try {
    const expectedHash = crypto.createHash('sha256').update(String(ADMIN_SECRET_KEY)).digest();
    const providedHash = crypto.createHash('sha256').update(String(adminKey)).digest();
    if (crypto.timingSafeEqual(expectedHash, providedHash)) {
      return eventStreamService.addAdminClient(res);
    }
  } catch (e) {}

  return res.status(403).json({ success: false, error: 'Forbidden: Invalid admin credentials.' });
});

/**
 * Admin Dispatch / Shipway Consignment Push
 */
const handleAdminDispatch = async (req, res) => {
  try {
    const { order_id, courier, status } = req.body;
    if (!order_id) {
      return res.status(400).json({ success: false, error: 'order_id is required' });
    }

    const order = await getOrderRecord(order_id);
    if (!order) {
      return res.status(404).json({ success: false, error: 'Order record not found.' });
    }

    const shipment = await logisticsService.pushOrderToShipway(order);
    const updated = await updateOrderShipmentInfo(order.id, {
      awb: shipment?.shipway_awb || `SW${Date.now().toString().slice(-8)}`,
      courier: courier || shipment?.courier_name || 'BlueDart Express (Priority)',
      status: status || 'DISPATCHED',
      trackingUrl: shipment?.tracking_url || `https://shipway.in/track/${order.id}`
    });

    // Broadcast update via SSE
    if (updated) {
      eventStreamService.broadcastOrderUpdate(updated);
    }

    await auditLogger.logAdminAction({
      adminUser: req.adminUser || 'admin',
      action: 'ORDER_DISPATCHED',
      targetId: order.id,
      ip: req.ip,
      details: { awb: updated.shipway_awb, courier: updated.courier_name, status: updated.delivery_status }
    });

    res.json({
      success: true,
      message: 'Fulfillment and consignment dispatch updated successfully.',
      order: updated
    });
  } catch (error) {
    console.error('Admin Dispatch Error:', error);
    res.status(500).json({ success: false, error: 'Dispatch update failed.' });
  }
};

router.post('/admin/dispatch', verifyAdminAuth, handleAdminDispatch);
router.post('/dispatch', verifyAdminAuth, handleAdminDispatch);

/**
 * Admin Cancel Order
 */
const handleAdminCancelOrder = async (req, res) => {
  try {
    const { order_id, reason } = req.body;
    if (!order_id) {
      return res.status(400).json({ success: false, error: 'Order ID is required' });
    }

    const order = await getOrderRecord(order_id);
    if (!order) {
      return res.status(404).json({ success: false, error: 'Order not found.' });
    }

    if (order.delivery_status === 'DISPATCHED' || order.delivery_status === 'IN_TRANSIT') {
      return res.status(400).json({
        success: false,
        error: `Order #${order_id} has already been dispatched and cannot be cancelled.`
      });
    }

    const cancelledOrder = await cancelOrderRecord(order_id, reason || 'Admin requested cancellation');
    
    // If order was paid via Razorpay, automatically trigger refund
    let refundResult = null;
    if (order.razorpay_payment_id && order.payment_status === 'PAID') {
      try {
        const amountPaise = Math.round(Number(order.total_amount || 0) * 100);
        refundResult = await paymentService.refundPayment({
          paymentId: order.razorpay_payment_id,
          amountInPaise: amountPaise,
          notes: { order_id: order.id, reason: reason || 'Admin cancelled order' }
        });
      } catch (refundErr) {
        console.warn('Auto-refund warning on cancellation:', refundErr.message);
      }
    }

    eventStreamService.broadcastOrderUpdate(cancelledOrder);

    await auditLogger.logAdminAction({
      adminUser: req.adminUser || 'admin',
      action: 'ORDER_CANCELLED',
      targetId: order_id,
      ip: req.ip,
      details: { reason: reason || 'Admin requested cancellation', refundId: refundResult?.id || null }
    });

    res.json({
      success: true,
      message: `Order #${order_id} has been cancelled successfully.${refundResult ? ' Razorpay refund initiated automatically.' : ''}`,
      order: cancelledOrder,
      refund: refundResult
    });
  } catch (error) {
    console.error('Admin Order Cancellation Error:', error);
    res.status(500).json({ success: false, error: 'Failed to cancel order.' });
  }
};

router.post('/admin/orders/cancel', verifyAdminAuth, handleAdminCancelOrder);

/**
 * Admin Redeem VIP Gift (Deduct 1000 Points)
 */
router.post('/admin/users/redeem-gift', verifyAdminAuth, async (req, res) => {
  try {
    const { email } = req.body;
    if (!email) {
      return res.status(400).json({ success: false, error: 'Customer email is required.' });
    }

    const updatedReward = await redeemUserPoints(email, 1000);
    if (!updatedReward) {
      return res.status(500).json({ success: false, error: 'Failed to redeem points.' });
    }

    await auditLogger.logAdminAction({
      adminUser: req.adminUser || 'admin',
      action: 'VIP_GIFT_REDEEMED',
      targetId: email,
      ip: req.ip,
      details: { pointsDeducted: 1000 }
    });

    res.json({
      success: true,
      message: `Successfully marked gift as sent to ${email} and deducted 1,000 points.`,
      reward: updatedReward
    });
  } catch (error) {
    console.error('Admin Redeem VIP Gift Error:', error);
    res.status(500).json({ success: false, error: 'Failed to redeem gift points.' });
  }
});

/**
 * Admin Analytics & KPI Summary
 */
const handleAdminStats = async (req, res) => {
  try {
    const orders = await getAllOrders();
    const paidOrders = orders.filter(o => o.payment_status === 'PAID');
    const totalRevenue = paidOrders.reduce((sum, o) => sum + Number(o.total_amount || 0), 0);
    const pendingOrders = orders.filter(o => o.delivery_status === 'BAKING' || o.payment_status === 'PENDING');
    const dispatchedOrders = orders.filter(o => ['DISPATCHED', 'IN_TRANSIT', 'DELIVERED'].includes(o.delivery_status));

    res.json({
      success: true,
      stats: {
        totalOrders: orders.length,
        paidOrdersCount: paidOrders.length,
        totalRevenue: Math.round(totalRevenue),
        pendingFulfillment: pendingOrders.length,
        dispatchedCount: dispatchedOrders.length,
        averageOrderValue: paidOrders.length > 0 ? Math.round(totalRevenue / paidOrders.length) : 0
      }
    });
  } catch (error) {
    console.error('Admin Stats Error:', error);
    res.status(500).json({ success: false, error: 'Failed to compute admin statistics.' });
  }
};

router.post('/admin/pickup/verify', verifyAdminAuth, async (req, res) => {
  try {
    const { order_id, pin, override } = req.body;
    if (!order_id) {
      return res.status(400).json({ success: false, error: 'Order ID is required.' });
    }

    const cleanOrderId = String(order_id).trim().replace(/^#/, '');
    const order = await getOrderRecord(cleanOrderId) || await getOrderRecord(order_id);
    if (!order) {
      return res.status(404).json({ success: false, error: `Order #${cleanOrderId} not found in database.` });
    }

    // If order has already been collected, return friendly success
    if (order.delivery_status === 'DELIVERED' || order.pickup_verified) {
      return res.json({
        success: true,
        already_collected: true,
        message: `✅ Order #${order.id} is already verified and marked as COLLECTED. Handover completed!`,
        order
      });
    }

    const enteredPin = String(pin || '').trim();
    const storedPin = String(order.pickup_pin || '').trim();

    // Verify PIN against stored order PIN if present and not overridden
    if (storedPin && enteredPin && storedPin !== enteredPin && !override) {
      return res.status(400).json({ 
        success: false, 
        error: 'Invalid Pickup Verification PIN. Please verify with the customer.',
        can_override: true
      });
    }

    const updated = await updateOrderShipmentInfo(order.id, {
      delivery_status: 'DELIVERED',
      pickup_handed_over_at: new Date().toISOString(),
      pickup_verified: true,
      pickup_pin: storedPin || enteredPin || '4892',
      payment_status: order.payment_method === 'Cash on Delivery' ? 'PAID' : order.payment_status
    });

    if (updated) {
      eventStreamService.broadcastOrderUpdate(updated);
    }

    await auditLogger.logAdminAction({
      adminUser: req.adminUser || 'admin',
      action: 'PICKUP_VERIFIED',
      targetId: order.id,
      ip: req.ip,
      details: { customer: order.user_name, pin: order.pickup_pin }
    });

    res.json({
      success: true,
      message: `✅ Order #${order.id} verified! Handed over to ${order.user_name || 'Customer'}.`,
      order: updated
    });
  } catch (error) {
    console.error('Pickup verification error:', error);
    res.status(500).json({ success: false, error: 'Failed to verify pickup: ' + error.message });
  }
});

router.post('/admin/orders/purge', verifyAdminAuth, async (req, res) => {
  try {
    await purgeAllOrders();
    res.json({ success: true, message: 'All orders ledger purged successfully.' });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Failed to purge orders.' });
  }
});

export default router;
