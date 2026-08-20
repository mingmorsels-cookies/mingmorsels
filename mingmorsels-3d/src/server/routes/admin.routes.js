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
  dismissAdminNotification
} from '../../../db.js';

const router = Router();

/**
 * Fetch all orders ledger for Admin Dashboard
 */
const handleGetAdminOrders = async (req, res) => {
  try {
    const orders = await getAllOrders();
    res.json({
      success: true,
      count: orders.length,
      orders
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
    const { order_id, pin } = req.body;
    if (!order_id) {
      return res.status(400).json({ success: false, error: 'Order ID is required' });
    }

    const order = await getOrderRecord(order_id);
    if (!order) {
      return res.status(404).json({ success: false, error: 'Order record not found.' });
    }

    // Verify PIN if order has a pickup_pin
    if (order.pickup_pin && pin && String(order.pickup_pin).trim() !== String(pin).trim()) {
      return res.status(400).json({ 
        success: false, 
        error: `Invalid Pickup PIN! The entered PIN does not match this customer's order.` 
      });
    }

    const updated = await updateOrderShipmentInfo(order.id, {
      delivery_status: 'DELIVERED',
      pickup_handed_over_at: new Date().toISOString(),
      pickup_verified: true
    });

    eventStreamService.broadcastStatusUpdate(order.id, 'DELIVERED');

    res.json({
      success: true,
      message: `✅ Order #${order.id} verified! Handed over to ${order.user_name || 'Customer'}.`,
      order: updated
    });
  } catch (error) {
    console.error('Pickup verification error:', error);
    res.status(500).json({ success: false, error: 'Failed to verify pickup.' });
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
