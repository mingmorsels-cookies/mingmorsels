import { describe, it, expect } from 'vitest';
import request from 'supertest';
import { app } from '../server.js';
import { generateCustomerToken } from '../src/server/middleware/auth.js';

describe('Ming Morsels API Endpoints (Supertest)', () => {
  it('GET /api/health - should return healthy status, correlation id and CSP headers', async () => {
    const res = await request(app).get('/api/health');
    expect(res.status).toBe(200);
    expect(res.body.status).toBe('healthy');
    expect(res.headers).toHaveProperty('x-request-id');
    expect(res.headers).toHaveProperty('content-security-policy');
  });

  it('GET /api/pincode/check - should return tiered shipping rates for all zones', async () => {
    // 1. Tier 1: Local Bengaluru (560xxx) -> ₹49, Free above ₹1000
    const localRes = await request(app).get('/api/pincode/check?pincode=560038');
    expect(localRes.status).toBe(200);
    expect(localRes.body.serviceable).toBe(true);
    expect(localRes.body.tier).toBe(1);
    expect(localRes.body.deliveryFee).toBe(49);
    expect(localRes.body.freeDeliveryAbove).toBe(1000);

    // 2. Tier 2: Karnataka Regional (570xxx) -> ₹69, Free above ₹1000
    const regRes = await request(app).get('/api/pincode/check?pincode=570001');
    expect(regRes.status).toBe(200);
    expect(regRes.body.serviceable).toBe(true);
    expect(regRes.body.tier).toBe(2);
    expect(regRes.body.deliveryFee).toBe(69);
    expect(regRes.body.freeDeliveryAbove).toBe(1000);

    // 3. Tier 3: South Zone (600xxx) -> ₹89, Free above ₹1000
    const southRes = await request(app).get('/api/pincode/check?pincode=600001');
    expect(southRes.status).toBe(200);
    expect(southRes.body.serviceable).toBe(true);
    expect(southRes.body.tier).toBe(3);
    expect(southRes.body.deliveryFee).toBe(89);
    expect(southRes.body.freeDeliveryAbove).toBe(1000);

    // 4. Tier 4: National Outstation (110xxx) -> ₹119, Free above ₹1000
    const nationalRes = await request(app).get('/api/pincode/check?pincode=110001');
    expect(nationalRes.status).toBe(200);
    expect(nationalRes.body.serviceable).toBe(true);
    expect(nationalRes.body.tier).toBe(4);
    expect(nationalRes.body.deliveryFee).toBe(119);
    expect(nationalRes.body.freeDeliveryAbove).toBe(1000);
  });

  it('POST /api/customer/auth - should issue a signed JWT customer session token', async () => {
    const res = await request(app)
      .post('/api/customer/auth')
      .send({
        email: 'connoisseur@mingmorsels.com',
        name: 'Devika Sharma'
      });
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body).toHaveProperty('token');
    expect(res.body.customer.email).toBe('connoisseur@mingmorsels.com');
  });

  it('GET /api/user/orders - should authenticate customer using Bearer JWT token', async () => {
    const token = generateCustomerToken({ email: 'test_jwt_user@example.com', name: 'Test User' });
    const res = await request(app)
      .get('/api/user/orders')
      .set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(Array.isArray(res.body.orders)).toBe(true);
  });

  it('POST /api/cart/abandoned - should capture checkout session for automated recovery', async () => {
    const res = await request(app)
      .post('/api/cart/abandoned')
      .send({
        email: 'recovery@example.com',
        name: 'Siddharth',
        phone: '9876543210',
        items: [{ id: 'almond', quantity: 2, price: 140 }],
        total_amount: 280
      });
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.cart.email).toBe('recovery@example.com');
  });

  it('POST /api/payment/create-order - should reject requests with missing items (Zod Validation)', async () => {
    const res = await request(app)
      .post('/api/payment/create-order')
      .send({
        items: [],
        total_amount: 100,
        user_email: 'test@example.com',
        shipping_address: '123 Test Street'
      });
    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
    expect(res.body.error).toContain('Order must contain at least 1 item');
  });

  it('POST /api/payment/create-order - should reject requests with invalid email (Zod Validation)', async () => {
    const res = await request(app)
      .post('/api/payment/create-order')
      .send({
        items: [{ id: 'almond', name: 'Almond Cookies', price: 140, quantity: 1 }],
        total_amount: 140,
        user_email: 'not-an-email',
        shipping_address: '123 Test Street, Bengaluru'
      });
    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
    expect(res.body.error).toContain('Please enter a valid email address');
  });

  it('POST /api/payment/create-order - should compute authoritative price from catalog and prevent price tampering', async () => {
    const res = await request(app)
      .post('/api/payment/create-order')
      .send({
        items: [{ id: 'rose', name: 'Rose Petal Cookies', price: 1, quantity: 1 }],
        total_amount: 1,
        user_email: 'customer@mingmorsels.com',
        user_name: 'Ananya Roy',
        shipping_address: '12th Main Road, Indiranagar, Bengaluru'
      });
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body).toHaveProperty('order_id');
    expect(res.body).toHaveProperty('customer_token');
    expect(res.body.amount).toBe(21700);
  });

  it('GET /api/orders/:id/invoice - should render GST tax invoice HTML document', async () => {
    // Authenticate customer first
    const authRes = await request(app)
      .post('/api/customer/auth')
      .send({ email: 'invoice.customer@example.com' });
    const token = authRes.body.token;

    // Create an order first
    const orderRes = await request(app)
      .post('/api/payment/create-order')
      .send({
        items: [{ id: 'almond', quantity: 1 }],
        user_email: 'invoice.customer@example.com',
        user_name: 'Invoice Connoisseur',
        shipping_address: 'Indiranagar, Bangalore'
      });
    const orderId = orderRes.body.order_id;

    const res = await request(app)
      .get(`/api/orders/${orderId}/invoice`)
      .set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(200);
    expect(res.headers['content-type']).toContain('text/html');
    expect(res.text).toContain('TAX INVOICE');
    expect(res.text).toContain('Ming Morsels');
    expect(res.text).toContain('MIORA DELIGHTS PRIVATE LIMITED');
    expect(res.text).toContain('29AAUCM5423C1Z9');
  });

  it('POST /api/payment/create-order - should reject orders exceeding available stock', async () => {
    const res = await request(app)
      .post('/api/payment/create-order')
      .send({
        items: [
          { id: 'walnut_sf', quantity: 9999 }
        ],
        user_email: 'customer@mingmorsels.com',
        shipping_address: '12th Main Road, Indiranagar, Bengaluru'
      });
    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
    expect(res.body.error).toContain('Insufficient stock');
  });

  it('GET /api/admin/orders - should reject unauthorized requests without admin key with 401', async () => {
    const res = await request(app).get('/api/admin/orders');
    expect(res.status).toBe(401);
    expect(res.body.success).toBe(false);
    expect(res.body.error).toContain('Unauthorized');
  });

  it('GET /api/admin/orders - should allow access with valid x-admin-key header', async () => {
    const adminKey = process.env.ADMIN_SECRET_KEY || 'Arun_Narayan_K';
    const res = await request(app)
      .get('/api/admin/orders')
      .set('x-admin-key', adminKey);
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(Array.isArray(res.body.orders)).toBe(true);
  });

  it('POST /api/payment/verify - should reject forged or mismatched payment signatures with 400', async () => {
    const res = await request(app)
      .post('/api/payment/verify')
      .send({
        order_id: 'order_live_98765',
        razorpay_payment_id: 'pay_live_12345',
        razorpay_signature: 'fake_forged_signature_hash_hex'
      });
    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
    expect(res.body.error).toContain('Invalid cryptographic signature');
  });
});
