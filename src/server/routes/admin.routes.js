// ─────────────────────────────────────────────────────────────────────────────
// Admin Management Routes (Protected with Admin Key Authentication)
// ─────────────────────────────────────────────────────────────────────────────

import { Router } from 'express';
import crypto from 'crypto';
import { verifyAdminAuth, ADMIN_SECRET_KEY, ADMIN_USERNAME, ADMIN_PASSWORD, ADMIN_TOTP_SECRET, generateAdminToken } from '../middleware/auth.js';
import { verifyTOTP } from '../utils/cryptoUtils.js';
import { auditLogger } from '../services/AuditLogger.js';
import { logisticsService } from '../services/LogisticsService.js';
import { paymentService } from '../services/PaymentService.js';
import { eventStreamService } from '../services/EventStreamService.js';
import { 
  getAllOrders, 
  getOrderRecord,
  updateOrderShipmentInfo,
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

    // 2. Timing-safe verification of Username & Password
    const expectedUserHash = crypto.createHash('sha256').update(String(ADMIN_USERNAME)).digest();
    const providedUserHash = crypto.createHash('sha256').update(String(username)).digest();
    const userValid = crypto.timingSafeEqual(expectedUserHash, providedUserHash);

    const expectedPassHash = crypto.createHash('sha256').update(String(ADMIN_PASSWORD)).digest();
    const providedPassHash = crypto.createHash('sha256').update(String(password)).digest();
    const passValid = crypto.timingSafeEqual(expectedPassHash, providedPassHash);

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

    // 3. TOTP MFA Verification (if provided, or verify against secret)
    if (totp_code) {
      const isTotpValid = verifyTOTP(totp_code, ADMIN_TOTP_SECRET);
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
    const allOrders = await getAllOrders();
    const orders = allOrders.filter(order => 
      order.delivery_status !== 'CANCELLED' && 
      order.payment_status !== 'FAILED' && 
      order.payment_status !== 'CANCELLED'
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
  const adminKey = req.query.admin_key || req.headers['x-admin-key'];

  if (!adminKey) {
    return res.status(401).json({ success: false, error: 'Unauthorized admin stream connection.' });
  }

  const expectedHash = crypto.createHash('sha256').update(String(ADMIN_SECRET_KEY)).digest();
  const providedHash = crypto.createHash('sha256').update(String(adminKey)).digest();

  if (!crypto.timingSafeEqual(expectedHash, providedHash)) {
    return res.status(403).json({ success: false, error: 'Forbidden: Invalid admin credentials.' });
  }

  eventStreamService.addAdminClient(res);
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
