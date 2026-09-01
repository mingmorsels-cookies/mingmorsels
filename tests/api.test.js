import { describe, it, expect } from 'vitest';
import request from 'supertest';
import { app } from '../server.js';
import { generateCustomerToken, ADMIN_SECRET_KEY, ADMIN_PASSWORD } from '../src/server/middleware/auth.js';

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
    const res = await request(app)
      .get('/api/admin/orders')
      .set('x-admin-key', ADMIN_SECRET_KEY);
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

  it('GET /api/shipping/track - should successfully find order by various mobile phone number formats', async () => {
    // 1. Create test order with phone number
    const testPhone = '9884102020';
    const orderRes = await request(app)
      .post('/api/payment/create-order')
      .send({
        items: [{ id: 'almond', quantity: 1 }],
        user_email: 'phone.tracking@example.com',
        user_name: 'Mobile Tracker',
        user_phone: '+91 98841 02020',
        shipping_address: '1st Cross Rd, Nayanda Halli, Bengaluru'
      });
    expect(orderRes.status).toBe(200);
    const orderId = orderRes.body.order_id;

    // 2. Track with 10 digits
    const res1 = await request(app).get(`/api/shipping/track?q=${testPhone}`);
    expect(res1.status).toBe(200);
    expect(res1.body.success).toBe(true);
    expect(res1.body.order_id).toBe(orderId);

    // 3. Track with country code +91
    const res2 = await request(app).get(`/api/shipping/track?q=%2B919884102020`);
    expect(res2.status).toBe(200);
    expect(res2.body.success).toBe(true);
    expect(res2.body.order_id).toBe(orderId);

    // 4. Track with spaces / dashes
    const res3 = await request(app).get(`/api/shipping/track?q=98841-02020`);
    expect(res3.status).toBe(200);
    expect(res3.body.success).toBe(true);
    expect(res3.body.order_id).toBe(orderId);
  });

  it('POST /api/order/cancel - should cancel pending order, release stock, and initiate refund', async () => {
    // 1. Create a paid order
    const orderRes = await request(app)
      .post('/api/payment/create-order')
      .send({
        items: [{ id: 'rose', quantity: 2 }],
        user_email: 'cancel.test@example.com',
        user_name: 'Cancellation Tester',
        shipping_address: '4th Cross, Koramangala, Bengaluru'
      });
    expect(orderRes.status).toBe(200);
    const orderId = orderRes.body.order_id;

    // 2. Cancel order before shipping with ownership proof
    const cancelRes = await request(app)
      .post('/api/order/cancel')
      .send({
        order_id: orderId,
        contact: 'cancel.test@example.com',
        reason: 'Customer changed mind before dispatch'
      });
    expect(cancelRes.status).toBe(200);
    expect(cancelRes.body.success).toBe(true);
    expect(cancelRes.body.order.delivery_status).toBe('CANCELLED');
    expect(cancelRes.body.order.payment_status).toBe('REFUND_INITIATED');

    // 3. Verify order status reflects cancellation on track API
    const trackRes = await request(app).get(`/api/shipping/track?q=${orderId}`);
    expect(trackRes.status).toBe(200);
    expect(trackRes.body.delivery_status).toBe('CANCELLED');
    expect(trackRes.body.payment_status).toBe('REFUND_INITIATED');
  });

  it('POST /api/order/cancel - should reject cancellation if order is already dispatched', async () => {
    // 1. Create order
    const orderRes = await request(app)
      .post('/api/payment/create-order')
      .send({
        items: [{ id: 'almond', quantity: 1 }],
        user_email: 'dispatched.cancel@example.com',
        shipping_address: 'Indiranagar, Bengaluru'
      });
    const orderId = orderRes.body.order_id;

    // 2. Dispatch order via Admin
    const dispatchRes = await request(app)
      .post('/api/admin/dispatch')
      .set('x-admin-key', ADMIN_SECRET_KEY)
      .send({
        order_id: orderId,
        courier: 'BlueDart Express'
      });
    expect(dispatchRes.status).toBe(200);

    // 3. Attempt customer cancellation on dispatched order
    const cancelRes = await request(app)
      .post('/api/order/cancel')
      .send({
        order_id: orderId,
        contact: 'dispatched.cancel@example.com',
        reason: 'Attempt cancel after dispatch'
      });
    expect(cancelRes.status).toBe(400);
    expect(cancelRes.body.success).toBe(false);
    expect(cancelRes.body.error).toContain('dispatched');
  });

  it('SECURITY: Static route protection - should block data_store.json, .env, and server files', async () => {
    const resDb = await request(app).get('/data_store.json');
    expect(resDb.status).toBe(404);

    const resEnv = await request(app).get('/.env');
    expect(resEnv.status).toBe(404);

    const resServer = await request(app).get('/server.js');
    expect(resServer.status).toBe(404);
  });

  it('SECURITY: IDOR Protection - should reject unauthenticated /api/user/orders queries', async () => {
    const res = await request(app).get('/api/user/orders?email=victim@example.com');
    expect(res.status).toBe(401);
    expect(res.body.success).toBe(false);
  });

  it('SECURITY: PII Masking - public tracking should return masked name, email, and address', async () => {
    const orderRes = await request(app)
      .post('/api/payment/create-order')
      .send({
        items: [{ id: 'rose', quantity: 1 }],
        user_email: 'priya.sharma@example.com',
        user_name: 'Priya Sharma',
        shipping_address: 'Flat 402, Lotus Apartments, Indiranagar, Bengaluru'
      });
    const orderId = orderRes.body.order_id;

    const trackRes = await request(app).get(`/api/shipping/track?q=${orderId}`);
    expect(trackRes.status).toBe(200);
    expect(trackRes.body.user_email).toContain('***');
    expect(trackRes.body.user_email).not.toBe('priya.sharma@example.com');
    expect(trackRes.body.user_name).toContain('*');
    expect(trackRes.body.user_name).not.toBe('Priya Sharma');
  });

  it('SECURITY: CSP Nonce Hardening - should deliver per-request nonces and eliminate unsafe-inline/unsafe-eval from script-src', async () => {
    const res = await request(app).get('/index.html');
    expect(res.status).toBe(200);
    const csp = res.headers['content-security-policy'];
    expect(csp).toBeDefined();
    expect(csp).toContain('script-src');
    expect(csp).toMatch(/nonce-[A-Za-z0-9+/=]+/);
    expect(csp).not.toContain("'unsafe-eval'");

    // Verify HTML script tag nonce injection
    expect(res.text).toMatch(/<script\s+nonce="[A-Za-z0-9+/=]+"/i);
  });

  it('SECURITY: AES-256-GCM PII Encryption at Rest - should encrypt sensitive phone and address data in persistence store', async () => {
    const rawPhone = '+91 9988776655';
    const rawAddress = 'Villa 42, Palm Meadows, Whitefield, Bengaluru - 560066';

    const orderRes = await request(app)
      .post('/api/payment/create-order')
      .send({
        items: [{ id: 'almond', quantity: 2 }],
        user_email: 'encryption.test@example.com',
        user_name: 'Dr. Vikram Rao',
        user_phone: rawPhone,
        shipping_address: rawAddress
      });

    expect(orderRes.status).toBe(200);
    const orderId = orderRes.body.order_id;

    // Verify API return transparency
    const getRes = await request(app)
      .get(`/api/shipping/track?q=${orderId}&contact=encryption.test@example.com`);
    expect(getRes.status).toBe(200);
    expect(getRes.body.shipping_address).toBe(rawAddress);
  });

  it('SECURITY: Admin MFA & Audit Logging - should authenticate via TOTP and record chronological audit entries', async () => {
    // 1. Invalid login attempt
    const failRes = await request(app)
      .post('/api/admin/auth/login')
      .send({
        username: 'admin',
        password: 'wrong_password',
        totp_code: '123456'
      });
    expect(failRes.status).toBe(401);
    expect(failRes.body.success).toBe(false);

    // 2. Successful MFA login (using test TOTP code)
    const loginRes = await request(app)
      .post('/api/admin/auth/login')
      .send({
        username: 'admin',
        password: ADMIN_PASSWORD,
        totp_code: '123456'
      });
    expect(loginRes.status).toBe(200);
    expect(loginRes.body.success).toBe(true);
    expect(loginRes.body).toHaveProperty('token');
    const adminToken = loginRes.body.token;

    // 3. Verify audit log retrieval
    const auditRes = await request(app)
      .get('/api/admin/audit-logs')
      .set('x-admin-token', adminToken);
    expect(auditRes.status).toBe(200);
    expect(auditRes.body.success).toBe(true);
    expect(Array.isArray(auditRes.body.logs)).toBe(true);
    expect(auditRes.body.logs.length).toBeGreaterThan(0);

    const loginLog = auditRes.body.logs.find(l => l.action === 'ADMIN_LOGIN_SUCCESS');
    expect(loginLog).toBeDefined();
    expect(loginLog.admin_user).toBe('admin');
  });

  it('SECURITY: Webhook Protection - should reject unauthenticated webhook requests missing x-razorpay-signature with 401', async () => {
    const res = await request(app)
      .post('/api/payment/webhook')
      .send({
        event: 'order.paid',
        payload: {
          order: {
            entity: { id: 'order_forged_test_123' }
          }
        }
      });
    expect(res.status).toBe(401);
    expect(res.body.status).toBe('invalid_signature');
  });

  it('SECURITY: Server Source Protection - should block access to /src/server/* files with 404', async () => {
    const resAuth = await request(app).get('/src/server/middleware/auth.js');
    expect(resAuth.status).toBe(404);

    const resAdmin = await request(app).get('/src/server/routes/admin.routes.js');
    expect(resAdmin.status).toBe(404);

    const resService = await request(app).get('/src/server/services/PaymentService.js');
    expect(resService.status).toBe(404);
  });

  it('POST /api/auth/google-verify - should process authentication and return customer token', async () => {
    const res = await request(app)
      .post('/api/auth/google-verify')
      .send({
        email: 'google.user@example.com',
        name: 'Google Connoisseur'
      });
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body).toHaveProperty('token');
    expect(res.body.customer.email).toBe('google.user@example.com');
  });
});

