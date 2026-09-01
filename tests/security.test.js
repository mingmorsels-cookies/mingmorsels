import { describe, it, expect } from 'vitest';
import request from 'supertest';
import { app } from '../server.js';
import { InvoiceService } from '../src/server/services/InvoiceService.js';
import { generateCustomerToken, ADMIN_SECRET_KEY } from '../src/server/middleware/auth.js';
import { createOrderRecord } from '../db.js';

describe('Security Hardening & Vulnerability Verification Suite', () => {

  it('Invoice XSS Defense: Should strictly escape malicious HTML/script tags in invoices', () => {
    const maliciousOrder = {
      id: 'MM-XSS123',
      user_name: '<script>alert("pwned")</script>',
      user_email: 'attacker"><script>alert(1)</script>@test.com',
      shipping_address: '<img src=x onerror=alert(1)> Flat 402, Bangalore',
      payment_id: 'pay_123"><script>',
      shipway_awb: 'AWB<script>',
      courier_name: 'BlueDart<iframe src="evil.com">',
      delivery_status: 'BAKING',
      total_amount: 500,
      items: [
        {
          name: 'Cookie <script>alert("xss")</script>',
          packaging: 'Luxury Box <style>body{display:none}</style>',
          quantity: 1,
          price: 500
        }
      ]
    };

    const html = InvoiceService.generateInvoiceHtml(maliciousOrder);

    // Verify unescaped tags do NOT exist in the output HTML
    expect(html).not.toContain('<script>alert("pwned")</script>');
    expect(html).not.toContain('<img src=x onerror=alert(1)>');
    expect(html).not.toContain('<iframe src="evil.com">');
    expect(html).not.toContain('<style>body{display:none}</style>');

    // Verify properly escaped entity equivalents exist
    expect(html).toContain('&lt;script&gt;alert(&quot;pwned&quot;)&lt;/script&gt;');
    expect(html).toContain('&lt;img src=x onerror=alert(1)&gt;');
  });

  it('Pickup PIN Leakage Defense: Should NOT leak stored pickup PIN in 400 error responses', async () => {
    const testOrderId = `MM-PINTEST-${Date.now()}`;
    await createOrderRecord({
      id: testOrderId,
      user_name: 'Pin Test User',
      user_email: 'pintest@example.com',
      user_phone: '9999988888',
      pickup_pin: '7412',
      items: [{ name: 'Rose Cookie', quantity: 1, price: 290 }],
      total_amount: 290,
      payment_method: 'Cash on Delivery',
      delivery_mode: 'pickup'
    });

    const res = await request(app)
      .post('/api/admin/pickup/verify')
      .set('x-admin-key', ADMIN_SECRET_KEY)
      .send({
        order_id: testOrderId,
        pin: '0000' // wrong PIN
      });

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
    expect(res.body).not.toHaveProperty('stored_pin');
    expect(res.body.error).not.toContain('7412');
    expect(res.body.error).toBe('Invalid Pickup Verification PIN. Please verify with the customer.');
  });

  it('IDOR Cancellation Defense: Should reject loose phone substring matching', async () => {
    const testOrderId = `MM-IDOR-${Date.now()}`;
    await createOrderRecord({
      id: testOrderId,
      user_name: 'Target Customer',
      user_email: 'target@example.com',
      user_phone: '9876543210',
      items: [{ name: 'Almond Cookie', quantity: 1, price: 320 }],
      total_amount: 320,
      delivery_status: 'BAKING'
    });

    // Attacker provides only the last 7 digits of the victim's phone number
    const res = await request(app)
      .post('/api/order/cancel')
      .send({
        order_id: testOrderId,
        contact: '6543210', // 7 digits substring, NOT full match
        reason: 'Malicious cancellation attempt'
      });

    expect(res.status).toBe(403);
    expect(res.body.success).toBe(false);
    expect(res.body.error).toContain('Forbidden');
  });

  it('IDOR Invoice Defense: Should reject unauthenticated access with substring phone numbers', async () => {
    const testOrderId = `MM-INV-IDOR-${Date.now()}`;
    await createOrderRecord({
      id: testOrderId,
      user_name: 'Target Customer',
      user_email: 'target@example.com',
      user_phone: '9876543210',
      items: [{ name: 'Almond Cookie', quantity: 1, price: 320 }],
      total_amount: 320
    });

    const res = await request(app)
      .get(`/api/orders/${testOrderId}/invoice?contact=6543210`);

    expect(res.status).toBe(403);
    expect(res.text).toContain('Access Denied');
  });

  it('Google OAuth Verification: Should accept verified test Google tokens and reject forged tokens', async () => {
    // Verified test credential
    const validRes = await request(app)
      .post('/api/customer/auth')
      .send({
        credential: 'test_google_token_valid_123'
      });

    expect(validRes.status).toBe(200);
    expect(validRes.body.success).toBe(true);
    expect(validRes.body.customer.email).toBe('connoisseur@mingmorsels.com');

    // Forged invalid token
    const invalidRes = await request(app)
      .post('/api/customer/auth')
      .send({
        credential: 'forged_fake_token_xyz'
      });

    expect(invalidRes.status).toBe(401);
    expect(invalidRes.body.success).toBe(false);
  });
});
