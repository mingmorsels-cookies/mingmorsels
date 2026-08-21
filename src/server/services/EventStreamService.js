// ─────────────────────────────────────────────────────────────────────────────
// Real-Time Server-Sent Events (SSE) Pub/Sub Broker
// Provides live order status tracking & admin notification streams
// ─────────────────────────────────────────────────────────────────────────────

import { EventEmitter } from 'events';

class EventStreamService extends EventEmitter {
  constructor() {
    super();
    this.setMaxListeners(500); // Support high concurrency
    this.orderClients = new Map(); // orderId -> Set of res objects
    this.adminClients = new Set(); // Set of res objects
  }

  /**
   * Registers a customer SSE client for a specific order.
   */
  addOrderClient(orderId, res) {
    if (!orderId || !res) return;
    const cleanId = String(orderId).trim();
    if (!this.orderClients.has(cleanId)) {
      this.orderClients.set(cleanId, new Set());
    }
    this.orderClients.get(cleanId).add(res);

    // Setup SSE Headers
    res.writeHead(200, {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
      'X-Accel-Buffering': 'no'
    });

    // Send initial connection acknowledgement
    res.write(`event: connected\ndata: ${JSON.stringify({ orderId: cleanId, timestamp: Date.now() })}\n\n`);

    // Clean up on client disconnect
    res.on('close', () => {
      const clients = this.orderClients.get(cleanId);
      if (clients) {
        clients.delete(res);
        if (clients.size === 0) this.orderClients.delete(cleanId);
      }
    });
  }

  /**
   * Registers an admin dashboard SSE client for all order updates.
   */
  addAdminClient(res) {
    if (!res) return;
    this.adminClients.add(res);

    res.writeHead(200, {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
      'X-Accel-Buffering': 'no'
    });

    res.write(`event: connected\ndata: ${JSON.stringify({ role: 'admin', timestamp: Date.now() })}\n\n`);

    res.on('close', () => {
      this.adminClients.delete(res);
    });
  }

  /**
   * Broadcasts an order status update to subscribed customers and admins.
   */
  broadcastOrderUpdate(order) {
    if (!order || !order.id) return;
    const cleanId = String(order.id).trim();
    const payload = JSON.stringify({
      orderId: cleanId,
      delivery_status: order.delivery_status || 'BAKING',
      payment_status: order.payment_status || 'PAID',
      courier_name: order.courier_name || 'BlueDart Express',
      shipway_awb: order.shipway_awb || 'SW-PENDING',
      tracking_url: order.tracking_url || '',
      updated_at: new Date().toISOString()
    });

    // 1. Notify customer clients
    const clients = this.orderClients.get(cleanId);
    if (clients) {
      clients.forEach(res => {
        try {
          res.write(`event: order_update\ndata: ${payload}\n\n`);
        } catch (err) {
          clients.delete(res);
        }
      });
    }

    // 2. Notify all admin dashboard clients
    this.adminClients.forEach(res => {
      try {
        res.write(`event: admin_order_feed\ndata: ${JSON.stringify(order)}\n\n`);
      } catch (err) {
        this.adminClients.delete(res);
      }
    });
  }

  /**
   * Broadcasts a new order creation event to admins.
   */
  broadcastNewOrder(order) {
    if (!order) return;
    this.adminClients.forEach(res => {
      try {
        res.write(`event: new_order\ndata: ${JSON.stringify(order)}\n\n`);
      } catch (err) {
        this.adminClients.delete(res);
      }
    });
  }

  /**
   * Broadcasts a 1000+ points VIP milestone re-order alert to all admin dashboard clients.
   */
  broadcastVipAlert(alertData) {
    if (!alertData) return;
    this.adminClients.forEach(res => {
      try {
        res.write(`event: vip_milestone_alert\ndata: ${JSON.stringify(alertData)}\n\n`);
      } catch (err) {
        this.adminClients.delete(res);
      }
    });
  }
}

export const eventStreamService = new EventStreamService();
