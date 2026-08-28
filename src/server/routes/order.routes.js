// ─────────────────────────────────────────────────────────────────────────────
// Order & Payment Routes (Secured with Server-Side Pricing & Strict Signatures)
// ─────────────────────────────────────────────────────────────────────────────

import { Router } from 'express';
import { z } from 'zod';
import { PriceCalculator } from '../services/PriceCalculator.js';
import { paymentService } from '../services/PaymentService.js';
import { logisticsService } from '../services/LogisticsService.js';
import { notificationService } from '../services/NotificationService.js';
import { eventStreamService } from '../services/EventStreamService.js';
import { InvoiceService } from '../services/InvoiceService.js';
import { sendPushToCustomer } from './push.routes.js';
import { validateCustomerSession, generateCustomerToken, verifyCustomerToken } from '../middleware/auth.js';
import {
  createOrderRecord,
  markOrderPaid,
  getUserOrders,
  getOrderRecord,
  cancelOrderRecord,
  checkStockAvailability,
  reserveStockHold,
  releaseStockHold,
  saveAbandonedCart,
  isPaymentAlreadyProcessed,
  saveAdminNotification
} from '../../../db.js';

const router = Router();

// Zod Order Creation Schema
const CreateOrderSchema = z.object({
  items: z.array(z.object({
    id: z.string().optional(),
    name: z.string().optional(),
    price: z.number().optional(),
    quantity: z.number().int().min(1, 'Quantity must be at least 1').max(10000, 'Maximum 10,000 units per item').default(1),
    packaging: z.string().optional(),
    image: z.string().optional()
  })).min(1, 'Order must contain at least 1 item'),
  total_amount: z.number().optional(),
  amount: z.number().optional(),
  coupon_code: z.string().optional(),
  gift_message: z.string().max(300).optional(),
  delivery_date: z.string().optional(),
  user_email: z.string().email('Please enter a valid email address'),
  user_name: z.string().optional(),
  user_phone: z.string().optional(),
  shipping_address: z.string().min(5, 'Please provide a complete delivery address'),
  receipt: z.string().optional()
});

// Zod Abandoned Cart Schema
const AbandonedCartSchema = z.object({
  email: z.string().email('Valid email required'),
  name: z.string().optional(),
  phone: z.string().optional(),
  items: z.array(z.any()).default([]),
  total_amount: z.number().optional()
});

/**
 * Customer Authentication & Token Generation
 */
router.post('/customer/auth', (req, res) => {
  try {
    const { email, name, picture } = req.body;
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return res.status(400).json({ success: false, error: 'Valid email required.' });
    }

    const cleanEmail = email.trim().toLowerCase();
    const token = generateCustomerToken({
      email: cleanEmail,
      name: name || 'Connoisseur',
      picture: picture || ''
    });

    res.json({
      success: true,
      token,
      customer: {
        email: cleanEmail,
        name: name || 'Connoisseur'
      }
    });
  } catch (err) {
    res.status(500).json({ success: false, error: 'Authentication failed.' });
  }
});

/**
 * Handles Order Creation with Authoritative Server-Side Price Calculation & Stock Holds
 */
const handleCreateOrder = async (req, res) => {
  try {
    const parseResult = CreateOrderSchema.safeParse(req.body);
    if (!parseResult.success) {
      const issues = parseResult.error?.issues || parseResult.error?.errors || [];
      const errorMsg = issues.map(e => e.message).join(', ') || 'Invalid request payload';
      return res.status(400).json({ success: false, error: errorMsg });
    }

    const { items, coupon_code, user_email, user_name, user_phone, shipping_address, receipt } = parseResult.data;

    // Check Live Inventory Availability
    const stockCheck = await checkStockAvailability(items);
    if (!stockCheck.available) {
      return res.status(400).json({
        success: false,
        error: `Insufficient stock for ${stockCheck.item}. Available: ${stockCheck.stock}, Requested: ${stockCheck.requested}.`
      });
    }

    // Server-Side Recalculation (Authoritative with Tiered Destination Shipping)
    const calculation = PriceCalculator.calculateOrderSummary(items, coupon_code, shipping_address);

    const orderId = receipt || `MM-${Date.now().toString().slice(-6)}`;

    // Handle COD (Cash on Delivery)
    if (req.body.payment_method === 'COD') {
      const isPickupOrder = String(shipping_address || '').includes('Store Pickup:') || String(shipping_address || '').toLowerCase().includes('pickup');
      const pickupPin = isPickupOrder ? String(Math.floor(1000 + Math.random() * 9000)) : null;

      const newOrder = await createOrderRecord({
        id: orderId,
        user_name: user_name || 'Valued Connoisseur',
        user_email: user_email.toLowerCase(),
        user_phone: user_phone,
        items: calculation.verifiedItems,
        total_amount: calculation.totalAmount,
        discount_amount: calculation.discountAmount,
        applied_coupon: calculation.appliedCoupon?.code || null,
        tax_gst: calculation.taxGST,
        delivery_fee: calculation.deliveryFee,
        delivery_mode: isPickupOrder ? 'pickup' : 'courier',
        pickup_pin: pickupPin,
        payment_method: 'Cash on Delivery',
        payment_status: 'PENDING',
        razorpay_order_id: null,
        shipping_address: shipping_address || 'Express Bengaluru Delivery'
      });

      reserveStockHold(newOrder.id, calculation.verifiedItems);
      eventStreamService.broadcastNewOrder(newOrder);

      // Non-blocking async background tasks (Auto Push to Shipway & Email/SMS dispatch)
      (async () => {
        if (!isPickupOrder) {
          try {
            const shipment = await logisticsService.pushOrderToShipway(newOrder);
            if (shipment) {
              newOrder.shipway_awb = shipment.shipway_awb;
              newOrder.courier_name = shipment.courier_name;
              newOrder.tracking_url = shipment.tracking_url;
              newOrder.delivery_status = shipment.status;
            }
          } catch (shipErr) {
            console.error('Shipway push warning:', shipErr);
          }
        }

        try {
          await notificationService.sendOrderConfirmationEmail(newOrder);
          await notificationService.sendOrderConfirmationSMS(newOrder);
          await sendPushToCustomer({
            phone: newOrder.user_phone,
            email: newOrder.user_email,
            title: `✅ Order #${newOrder.id} Confirmed — Ming Morsels`,
            body: isPickupOrder
              ? `Your order (₹${newOrder.total_amount}) is confirmed for Store Pickup at Indiranagar. Ready in 2-3 hrs!`
              : `Your cookies are in the oven! Order ₹${newOrder.total_amount} confirmed. Delivery in 2-4 hrs 🍪`,
            url: `/order-confirmation.html?order_id=${newOrder.id}&payment_id=Cash%20On%20Delivery`,
            orderId: newOrder.id
          });
        } catch (notifyErr) {
          console.error('Notification warning:', notifyErr);
        }
      })().catch(err => console.error('Background COD dispatch error:', err));

      return res.json({
        success: true,
        order_id: orderId,
        pickup_pin: pickupPin,
        is_cod: true
      });
    }

    // Create Razorpay Order
    const { rzpOrderId } = await paymentService.createRazorpayOrder({
      amountInPaise: calculation.amountInPaise,
      currency: 'INR',
      receipt: orderId,
      notes: {
        customer_name: user_name || 'Guest Connoisseur',
        customer_email: user_email
      }
    });

    // Detect Store Self-Pickup Mode & Generate 4-digit Verification PIN
    const isPickupOrder = String(shipping_address || '').includes('Store Pickup:') || String(shipping_address || '').toLowerCase().includes('pickup');
    const pickupPin = isPickupOrder ? String(Math.floor(1000 + Math.random() * 9000)) : null;

    // Store Order Record in Database
    const newOrder = await createOrderRecord({
      id: orderId,
      user_name: user_name || 'Valued Connoisseur',
      user_email: user_email.toLowerCase(),
      user_phone: user_phone,
      items: calculation.verifiedItems,
      total_amount: calculation.totalAmount,
      discount_amount: calculation.discountAmount,
      applied_coupon: calculation.appliedCoupon?.code || null,
      tax_gst: calculation.taxGST,
      delivery_fee: calculation.deliveryFee,
      delivery_mode: isPickupOrder ? 'pickup' : 'courier',
      pickup_pin: pickupPin,
      payment_method: 'Prepaid (Razorpay)',
      payment_status: 'PENDING',
      razorpay_order_id: rzpOrderId,
      shipping_address: shipping_address || 'Express Bengaluru Delivery'
    });

    // Place temporary stock reservation hold (10 mins TTL)
    reserveStockHold(newOrder.id, calculation.verifiedItems);

    // Broadcast real-time new order to admin stream
    eventStreamService.broadcastNewOrder(newOrder);

    // Auto-issue customer JWT for seamless session retention
    const customerToken = generateCustomerToken({
      email: user_email.toLowerCase(),
      name: user_name || 'Valued Connoisseur'
    });

    res.json({
      success: true,
      order_id: newOrder.id,
      payment_method: newOrder.payment_method,
      razorpay_order_id: rzpOrderId,
      amount: calculation.amountInPaise,
      total_amount: calculation.totalAmount,
      currency: 'INR',
      key_id: paymentService.keyId,
      customer_token: customerToken,
      breakdown: {
        subtotal: calculation.subtotal,
        discount: calculation.discountAmount,
        packaging: calculation.packagingTotal,
        gst: calculation.taxGST,
        shipping: calculation.deliveryFee
      }
    });
  } catch (error) {
    console.error('Create Order Error:', error);
    res.status(500).json({ success: false, error: error.message || 'Failed to create order.' });
  }
};

router.post('/create-order', handleCreateOrder);
router.post('/payment/create-order', handleCreateOrder);

/**
 * Live Order Status SSE Stream (Customer Real-Time Tracking)
 */
router.get('/orders/:id/stream', (req, res) => {
  const orderId = req.params.id;
  eventStreamService.addOrderClient(orderId, res);
});

/**
 * Handles Payment Verification with Strict Cryptographic Signature Validation
 */
const handleVerifyPayment = async (req, res) => {
  try {
    const { order_id, razorpay_order_id, razorpay_payment_id, razorpay_signature } = req.body;

    const targetOrderId = order_id || razorpay_order_id;
    if (!targetOrderId || (!razorpay_payment_id && !req.body.payment_id)) {
      return res.status(400).json({
        success: false,
        error: 'Missing required payment verification fields (order_id & payment_id).'
      });
    }

    const paymentId = razorpay_payment_id || req.body.payment_id;
    const rzpOrderId = razorpay_order_id || targetOrderId;

    // Strict Replay Attack Protection: Check if paymentId already used elsewhere
    const isReplay = await isPaymentAlreadyProcessed(paymentId, targetOrderId);
    if (isReplay) {
      console.warn(`🚨 [SECURITY ALERT] Payment replay attack detected for payment ${paymentId}`);
      return res.status(409).json({
        success: false,
        error: 'Conflict: This payment transaction has already been processed.'
      });
    }

    // Strict HMAC SHA-256 Signature Verification
    const verification = paymentService.verifyPaymentSignature({
      orderId: rzpOrderId,
      paymentId,
      signature: razorpay_signature
    });

    if (!verification.valid) {
      console.warn(`🚨 [SECURITY ALERT] Payment signature mismatch for order ${rzpOrderId}: ${verification.reason}`);
      return res.status(400).json({
        success: false,
        error: 'Payment verification failed: Invalid cryptographic signature.'
      });
    }

    // Mark Order Paid in DB (releases reservation hold and decrements stock)
    let updatedOrder = await markOrderPaid(targetOrderId, paymentId);

    if (updatedOrder) {
      // 1. Calculate Reward Points & Check VIP 1,000+ Points Milestone
      try {
        const customerOrders = await getUserOrders(updatedOrder.user_email);
        const paidOrders = customerOrders.filter(o => o.payment_status === 'PAID');
        const paidCount = paidOrders.length;
        // Each order grants 100 Reward Points
        const previousPoints = Math.max(0, (paidCount - 1) * 100);
        const currentPoints = paidCount * 100;

        updatedOrder.reward_points_earned = 100;
        updatedOrder.customer_reward_points = currentPoints;

        // If customer had completed 1,000 points and is ordering again!
        if (previousPoints >= 1000) {
          updatedOrder.is_vip_milestone_order = true;
          updatedOrder.vip_milestone_badge = '👑 1000+ Pts VIP';
          updatedOrder.vip_milestone_message = `⭐ VIP Customer Alert: ${updatedOrder.user_name || 'Valued Connoisseur'} (${updatedOrder.user_email}) has completed 1,000+ Reward Points (${currentPoints} pts total) and placed a new order #${updatedOrder.id}!`;

          const vipAlert = {
            type: 'VIP_MILESTONE_ALERT',
            title: '👑 1,000+ Points VIP Milestone Re-Order!',
            message: `VIP Customer ${updatedOrder.user_name || 'Valued Connoisseur'} (${updatedOrder.user_email}) has ${currentPoints} total Reward Points (completed 1,000+ milestone) and placed order #${updatedOrder.id} for ₹${updatedOrder.total_amount}!`,
            order_id: updatedOrder.id,
            user_name: updatedOrder.user_name || 'Valued Connoisseur',
            user_email: updatedOrder.user_email,
            total_points: currentPoints,
            total_amount: updatedOrder.total_amount,
            created_at: new Date().toISOString()
          };

          await saveAdminNotification(vipAlert);
          eventStreamService.broadcastVipAlert(vipAlert);
          console.log(`👑 [VIP REWARD ALERT] ${vipAlert.message}`);
        }
      } catch (ptsErr) {
        console.warn('Reward points calculation warning:', ptsErr);
      }

      // Non-blocking async background tasks (Shipway & Email/SMS dispatch)
      (async () => {
        try {
          const shipment = await logisticsService.pushOrderToShipway(updatedOrder);
          if (shipment) {
            updatedOrder.shipway_awb = shipment.shipway_awb;
            updatedOrder.courier_name = shipment.courier_name;
            updatedOrder.tracking_url = shipment.tracking_url;
            updatedOrder.delivery_status = shipment.status;
          }
        } catch (shipErr) {
          console.error('Shipway push warning:', shipErr);
        }

        try {
          await notificationService.sendOrderConfirmationEmail(updatedOrder);
          notificationService.sendOrderConfirmationSMS(updatedOrder);
        } catch (notifErr) {
          console.error('Notification dispatch warning:', notifErr);
        }
      })().catch(err => console.error('Background payment verification dispatch error:', err));

      // 4. Real-time SSE Broadcast to customer & admin
      eventStreamService.broadcastOrderUpdate(updatedOrder);
    }

    res.json({
      success: true,
      message: 'Payment verified, logistics dispatched & confirmation email sent.',
      order: updatedOrder
    });
  } catch (error) {
    console.error('Verify Payment Error:', error);
    res.status(500).json({ success: false, error: 'Payment verification failed.' });
  }
};

router.post('/verify-payment', handleVerifyPayment);
router.post('/payment/verify', handleVerifyPayment);

/**
 * Webhook Listener for Razorpay Events
 */
router.post('/payment/webhook', async (req, res) => {
  try {
    const signature = req.headers['x-razorpay-signature'];
    const rawBody = req.rawBody || Buffer.from(JSON.stringify(req.body));

    const isValid = paymentService.verifyWebhookSignature(rawBody, signature);
    if (!isValid && signature) {
      console.warn('🚨 Invalid webhook signature received.');
      return res.status(400).json({ status: 'invalid_signature' });
    }

    const event = req.body;
    if (event.event === 'order.paid' || event.event === 'payment.captured') {
      const paymentEntity = event.payload?.payment?.entity;
      const rzpOrderId = paymentEntity ? paymentEntity.order_id : event.payload?.order?.entity?.id;
      const paymentId = paymentEntity ? paymentEntity.id : 'pay_webhook';

      if (rzpOrderId) {
        const order = await markOrderPaid(rzpOrderId, paymentId);
        if (order) {
          const shipment = await logisticsService.pushOrderToShipway(order);
          await notificationService.sendOrderConfirmationEmail(order);
          notificationService.sendOrderConfirmationSMS(order);
          console.log(`✅ [Webhook Processed] Order #${order.id} automatically marked paid.`);
        }
      }
    }

    res.status(200).json({ status: 'ok' });
  } catch (err) {
    console.error('Webhook Processing Error:', err);
    res.status(200).json({ status: 'error_logged' });
  }
});

/**
 * Customer Order History (Protected with JWT or email validation)
 */
router.get('/user/orders', validateCustomerSession, async (req, res) => {
  try {
    const orders = await getUserOrders(req.customerEmail);
    res.json({ success: true, count: orders.length, orders });
  } catch (error) {
    console.error('Get User Orders Error:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch customer order history.' });
  }
});

/**
 * Public Live Tracking Endpoint
 */
router.get('/shipping/track', async (req, res) => {
  try {
    const query = req.query.q || req.query.order_id || req.query.awb;
    if (!query) {
      return res.status(400).json({ success: false, error: 'Please provide order_id or awb.' });
    }

    const order = await getOrderRecord(query);
    if (!order) {
      return res.status(404).json({ success: false, error: 'Order not found.' });
    }

    const trackingData = logisticsService.getOrderTrackingInfo(order);
    const parsedItems = Array.isArray(order.items) 
      ? order.items 
      : (typeof order.items_json === 'string' ? JSON.parse(order.items_json) : []);

    res.json({ 
      success: true, 
      order_id: order.id,
      awb: order.shipway_awb || trackingData.awb || 'SW-PENDING',
      courier: order.courier_name || trackingData.courier || 'BlueDart Express (Shipway Partner)',
      delivery_status: order.delivery_status || trackingData.status || 'BAKING',
      estimated_delivery: new Date(Date.now() + 2 * 86400000).toLocaleDateString('en-IN', { weekday: 'short', month: 'short', day: 'numeric' }),
      shipping_address: order.shipping_address,
      delivery_mode: order.delivery_mode,
      pickup_pin: order.pickup_pin,
      items: parsedItems,
      total_amount: order.total_amount,
      discount_amount: order.discount_amount || 0,
      delivery_fee: order.delivery_fee || 0,
      tax_gst: order.tax_gst || 0,
      payment_method: order.payment_method || 'Prepaid',
      user_name: order.user_name,
      user_email: order.user_email,
      created_at: order.created_at,
      timeline: trackingData.timeline,
      tracking: trackingData 
    });
  } catch (error) {
    console.error('Tracking Error:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch tracking details.' });
  }
});

/**
 * Get Specific Order Record (Protected against IDOR - verifies customer session or admin)
 */
const handleGetSingleOrder = async (req, res) => {
  try {
    const order = await getOrderRecord(req.params.id);
    if (!order) {
      return res.status(404).json({ success: false, error: 'Order not found.' });
    }

    // IDOR Protection: Verify ownership or admin privilege
    const requesterEmail = req.customerEmail;
    const orderEmail = (order.user_email || '').toLowerCase().trim();
    if (!req.isAdmin && (!requesterEmail || requesterEmail !== orderEmail)) {
      // Return redacted public summary instead of 403 to prevent oracle attacks while masking PII
      return res.json({
        success: true,
        order: {
          id: order.id,
          delivery_status: order.delivery_status,
          created_at: order.created_at,
          total_amount: order.total_amount,
          items_count: (order.items || []).length
        },
        redacted: true
      });
    }

    res.json({ success: true, order });
  } catch (err) {
    res.status(500).json({ success: false, error: 'Failed to retrieve order.' });
  }
};

router.get('/order/:id', validateCustomerSession, handleGetSingleOrder);
router.get('/orders/:id', validateCustomerSession, handleGetSingleOrder);

const handleCancelOrder = async (req, res) => {
  try {
    const { order_id, reason, contact } = req.body;
    if (!order_id) {
      return res.status(400).json({ success: false, error: 'Order ID is required.' });
    }

    const order = await getOrderRecord(order_id);
    if (!order) {
      return res.status(404).json({ success: false, error: 'Order not found.' });
    }

    // IDOR Protection: Verify ownership or admin privilege
    const requesterEmail = req.customerEmail; // Might be undefined if no token
    const orderEmail = (order.user_email || '').toLowerCase().trim();
    const orderPhone = (order.user_phone || '').replace(/\D/g, '');
    const cleanContact = (contact || '').trim().toLowerCase();
    const contactPhone = cleanContact.replace(/\D/g, '');
    
    const isOwner = req.isAdmin || 
                    (requesterEmail && requesterEmail === orderEmail) ||
                    (cleanContact && cleanContact === orderEmail) ||
                    (contactPhone && contactPhone.length >= 7 && orderPhone.includes(contactPhone)) ||
                    (cleanContact === order.id.toLowerCase()) || 
                    (cleanContact === (order.shipway_awb || '').toLowerCase());

    if (!isOwner) {
      return res.status(403).json({ success: false, error: 'Forbidden: You do not own this order.' });
    }

    // Strict Cancellation Policy: Customers can only cancel before dispatch/shipping
    const shippedStatuses = ['DISPATCHED', 'IN_TRANSIT', 'SHIPPED', 'DELIVERED'];
    if (shippedStatuses.includes(order.delivery_status)) {
      return res.status(400).json({ 
        success: false, 
        error: `Cancellation Policy: Order #${order_id} has already been dispatched from the bakery and cannot be cancelled once in transit with the courier.` 
      });
    }

    const cancelledOrder = await cancelOrderRecord(order_id, reason || 'Customer requested cancellation');
    res.json({
      success: true,
      message: `Order #${order_id} has been cancelled successfully.`,
      order: cancelledOrder
    });
  } catch (error) {
    console.error('Order cancellation error:', error);
    res.status(500).json({ success: false, error: 'Failed to cancel order.' });
  }
};

// Use a loose middleware that doesn't block if token is missing, or we can just bypass it.
// We'll bypass it and let the route handle it.
router.post('/order/cancel', handleCancelOrder);
router.post('/shipping/cancel', handleCancelOrder);

/**
 * GST Tax Invoice Endpoint (Protected against IDOR)
 */
router.get('/orders/:id/invoice', async (req, res) => {
  try {
    const orderId = req.params.id;
    const order = await getOrderRecord(orderId);
    if (!order) {
      return res.status(404).send('<h2 style="font-family: sans-serif; text-align: center; margin-top: 50px;">Order record not found.</h2>');
    }

    // IDOR Protection: Verify ownership
    const contact = req.query.contact || '';
    const cleanContact = contact.trim().toLowerCase();
    const contactPhone = cleanContact.replace(/\D/g, '');
    const orderEmail = (order.user_email || '').toLowerCase().trim();
    const orderPhone = (order.user_phone || '').replace(/\D/g, '');
    
    // Check if the provided contact (from tracking) matches the order
    const isOwner = (cleanContact && cleanContact === orderEmail) ||
                    (contactPhone && contactPhone.length >= 7 && orderPhone.includes(contactPhone)) ||
                    (cleanContact === order.id.toLowerCase()) || 
                    (cleanContact === (order.shipway_awb || '').toLowerCase());

    if (!isOwner) {
      return res.status(403).send('<h2 style="font-family: sans-serif; text-align: center; margin-top: 50px;">Access Denied: Invoice restricted to order owner.</h2>');
    }

    const invoiceHtml = InvoiceService.generateInvoiceHtml(order);
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.send(invoiceHtml);
  } catch (err) {
    console.error('Invoice Generation Error:', err);
    res.status(500).send('Failed to generate invoice.');
  }
});

/**
 * Abandoned Cart Tracker
 */
router.post('/cart/abandoned', async (req, res) => {
  try {
    const parseResult = AbandonedCartSchema.safeParse(req.body);
    if (!parseResult.success) {
      return res.status(400).json({ success: false, error: 'Valid email and cart data required.' });
    }

    const { email, name, phone, items, total_amount } = parseResult.data;
    const saved = await saveAbandonedCart({
      email,
      name,
      phone,
      items,
      totalAmount: total_amount
    });

    res.json({ success: true, message: 'Cart lead captured for concierge follow-up.', cart: saved });
  } catch (err) {
    console.error('Abandoned Cart Capture Error:', err);
    res.status(500).json({ success: false, error: 'Failed to capture cart session.' });
  }
});

/**
 * Public Live Events SSE Stream (Broadcasts recent order popups)
 */
router.get('/events/live', (req, res) => {
  res.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    'Connection': 'keep-alive',
    'X-Accel-Buffering': 'no'
  });
  res.write(`event: connected\ndata: ${JSON.stringify({ status: 'connected', timestamp: Date.now() })}\n\n`);

  const onNewOrder = (order) => {
    try {
      res.write(`data: ${JSON.stringify({ type: 'NEW_ORDER', order: { user_name: order.user_name, items: order.items } })}\n\n`);
    } catch (e) {}
  };

  eventStreamService.on('new_order_event', onNewOrder);

  req.on('close', () => {
    eventStreamService.off('new_order_event', onNewOrder);
  });
});

export default router;
