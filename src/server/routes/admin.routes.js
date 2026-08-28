// ─────────────────────────────────────────────────────────────────────────────
// Admin Management Routes (Protected with Admin Key Authentication)
// ─────────────────────────────────────────────────────────────────────────────

import { Router } from 'express';
import { verifyAdminAuth } from '../middleware/auth.js';
import { logisticsService } from '../services/LogisticsService.js';
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
  const expectedKey = process.env.ADMIN_SECRET_KEY || 'Arun_Narayan_K';

  if (!adminKey || adminKey !== expectedKey) {
    return res.status(401).json({ success: false, error: 'Unauthorized admin stream connection.' });
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
    
    eventStreamService.broadcastOrderUpdate(cancelledOrder);

    res.json({
      success: true,
      message: `Order #${order_id} has been cancelled successfully by Admin.`,
      order: cancelledOrder
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
        error: `Invalid PIN! Customer provided ${enteredPin}, but system PIN is ${storedPin}.`,
        stored_pin: storedPin,
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

    eventStreamService.broadcastStatusUpdate(order.id, 'DELIVERED');

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
