import 'dotenv/config';
import crypto from 'crypto';
import Razorpay from 'razorpay';

export class PaymentService {
  constructor() {
    this.initClient();
  }

  initClient() {
    this.keyId = process.env.RAZORPAY_KEY_ID || process.env.VITE_RAZORPAY_KEY_ID || '';
    this.keySecret = process.env.RAZORPAY_KEY_SECRET || '';
    this.webhookSecret = process.env.RAZORPAY_WEBHOOK_SECRET || this.keySecret;

    if (this.keyId && this.keySecret) {
      try {
        this.razorpay = new Razorpay({
          key_id: this.keyId,
          key_secret: this.keySecret
        });
      } catch (err) {
        console.warn('⚠️ Razorpay client initialization error:', err.message);
      }
    }
  }

  getRazorpayClient() {
    if (!this.razorpay || !this.keyId) {
      this.initClient();
    }
    return this.razorpay;
  }

  /**
   * Creates a Razorpay Order.
   */
  async createRazorpayOrder({ amountInPaise, currency = 'INR', receipt, notes = {} }) {
    if (process.env.NODE_ENV === 'test') {
      return {
        rzpOrderId: `order_test_${Date.now()}`,
        simulated: true
      };
    }

    const client = this.getRazorpayClient();
    if (client) {
      try {
        const order = await client.orders.create({
          amount: amountInPaise,
          currency,
          receipt: receipt || `MM-${Date.now().toString().slice(-6)}`,
          payment_capture: 1,
          notes
        });
        if (order && order.id) {
          return { rzpOrderId: order.id, simulated: false };
        }
      } catch (err) {
        console.error('Razorpay API order creation error:', err.error?.description || err.message || err);
        throw new Error(`Razorpay Gateway Error: ${err.error?.description || err.message || 'Authentication or network error'}`);
      }
    }

    throw new Error('Razorpay API Keys are not configured on server. Please check RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET in .env');
  }

  /**
   * Captures an authorized payment.
   */
  async capturePayment(paymentId, amountInPaise) {
    const client = this.getRazorpayClient();
    if (!client || !paymentId) return null;
    try {
      return await client.payments.capture(paymentId, amountInPaise, 'INR');
    } catch (err) {
      console.warn('Razorpay auto-capture notice (may already be captured):', err.message);
      return null;
    }
  }

  /**
   * Verifies Razorpay HMAC SHA-256 payment signature.
   * STRICT: Returns true only if cryptographic verification passes or is simulated in test.
   */
  verifyPaymentSignature({ orderId, paymentId, signature }) {
    if (!orderId || !paymentId) {
      return { valid: false, reason: 'Missing orderId or paymentId' };
    }

    if (process.env.NODE_ENV === 'test' && signature === 'test_valid_signature') {
      return { valid: true, simulated: true };
    }

    if (!signature) {
      return { valid: false, reason: 'Missing payment signature header/field' };
    }

    const payload = `${orderId}|${paymentId}`;
    const expectedSignature = crypto
      .createHmac('sha256', this.keySecret)
      .update(payload)
      .digest('hex');

    const expectedBuffer = Buffer.from(expectedSignature);
    const providedBuffer = Buffer.from(signature);

    if (expectedBuffer.length !== providedBuffer.length) {
      return { valid: false, reason: 'Signature length mismatch' };
    }

    const isValid = crypto.timingSafeEqual(expectedBuffer, providedBuffer);
    if (!isValid) {
      return { valid: false, reason: 'Signature mismatch' };
    }

    return { valid: true, simulated: false };
  }

  /**
   * Verifies incoming webhook signature.
   */
  verifyWebhookSignature(rawBodyBuffer, signature) {
    if (!signature || !rawBodyBuffer) return false;
    try {
      const expectedSig = crypto
        .createHmac('sha256', this.webhookSecret)
        .update(rawBodyBuffer)
        .digest('hex');

      return crypto.timingSafeEqual(
        Buffer.from(expectedSig),
        Buffer.from(signature)
      );
    } catch (e) {
      return false;
    }
  }
}

export const paymentService = new PaymentService();
