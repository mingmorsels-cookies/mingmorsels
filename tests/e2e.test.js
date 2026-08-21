import { describe, it, expect } from 'vitest';
import request from 'supertest';
import { app } from '../server.js';
import { paymentGatewayFactory } from '../src/server/services/PaymentGatewayFactory.js';
import { currencyService } from '../src/server/services/CurrencyService.js';
import { whatsAppService } from '../src/server/services/WhatsAppService.js';
import { eventStreamService } from '../src/server/services/EventStreamService.js';

describe('Ming Morsels E2E Full Lifecycle & Integration Suite', () => {
  it('E2E Shopper Checkout Journey: Cart -> Coupon -> Order -> Payment Verification', async () => {
    // Step 1: Create Order with Items and Verified Coupon
    const orderPayload = {
      items: [
        { id: 'almond', name: 'Royal Roasted Almond Box', price: 160, quantity: 2 },
        { id: 'rose', name: 'Damascus Rose Petal Box', price: 160, quantity: 1 }
      ],
      coupon_code: 'FIRSTBITE', // 10% discount
      gift_message: 'Happy Anniversary!',
      delivery_date: '2026-08-25',
      user_name: 'Priya Sharma',
      user_email: 'priya.sharma@example.com',
      shipping_address: '42, 100 Feet Road, Indiranagar, Bengaluru - 560038'
    };

    const createRes = await request(app)
      .post('/api/payment/create-order')
      .send(orderPayload);

    expect(createRes.status).toBe(200);
    expect(createRes.body.success).toBe(true);
    expect(createRes.body).toHaveProperty('order_id');
    expect(createRes.body).toHaveProperty('razorpay_order_id');
    
    // Subtotal: 480, Discount: 48 => Net Subtotal: 432, Shipping: 45
    // Authoritative Total Amount: 477
    expect(createRes.body.total_amount).toBe(477);
    expect(createRes.body.amount).toBe(47700);

    const orderId = createRes.body.order_id;
    const rzpOrderId = createRes.body.razorpay_order_id;

    // Step 2: Track Order Info Retrieval (Authenticated Customer Session)
    const trackRes = await request(app)
      .get(`/api/order/${orderId}`)
      .set('Authorization', `Bearer ${createRes.body.customer_token}`);
    expect(trackRes.status).toBe(200);
    expect(trackRes.body.success).toBe(true);
    expect(trackRes.body.order.user_email).toBe('priya.sharma@example.com');
  });

  it('Payment Gateway Factory: should support automated failover', async () => {
    const order = await paymentGatewayFactory.createOrder({
      amountInPaise: 50000,
      currency: 'INR',
      receipt: 'MM-E2E-TEST'
    });
    expect(order).toHaveProperty('gateway');
    expect(order).toHaveProperty('orderId');
    expect(order.currency).toBe('INR');
  });

  it('Currency Engine: should accurately convert INR to USD, EUR, and GBP', () => {
    const usd = currencyService.convertFromINR(1000, 'USD');
    expect(usd.targetCurrency).toBe('USD');
    expect(usd.targetAmount).toBe(12.00);
    expect(usd.formatted).toBe('$12.00');

    const eur = currencyService.convertFromINR(1000, 'EUR');
    expect(eur.targetCurrency).toBe('EUR');
    expect(eur.targetAmount).toBe(11.00);
  });

  it('WhatsApp Service: should generate formatted dispatch templates', async () => {
    const mockOrder = {
      id: 'MM-789012',
      user_name: 'Dr. Arjun Mehta',
      shipway_awb: 'SW88291039',
      courier_name: 'BlueDart Air Express',
      tracking_url: 'https://mingmorsels.com/track-order?order=MM-789012'
    };

    const template = whatsAppService.generateDispatchTemplate(mockOrder);
    expect(template).toContain('Dr. Arjun Mehta');
    expect(template).toContain('MM-789012');
    expect(template).toContain('BlueDart Air Express');

    const res = await whatsAppService.sendDispatchNotification(mockOrder, '+919876543210');
    expect(res.success).toBe(true);
  });

  it('Real-Time SSE Broker: should register clients and handle broadcasts safely', () => {
    let closed = false;
    const mockRes = {
      writeHead: () => {},
      write: (data) => {},
      on: (event, cb) => {}
    };

    eventStreamService.addOrderClient('MM-TEST-SSE', mockRes);
    expect(eventStreamService.orderClients.has('MM-TEST-SSE')).toBe(true);

    eventStreamService.broadcastOrderUpdate({ id: 'MM-TEST-SSE', delivery_status: 'DISPATCHED' });
  });
});
