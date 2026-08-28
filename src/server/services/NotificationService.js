// ─────────────────────────────────────────────────────────────────────────────
// Transactional Notification Service (Email & SMS with Live Tracking & Invoice)
// Uses Resend (HTTPS API) instead of SMTP — works on Railway without port blocks
// ─────────────────────────────────────────────────────────────────────────────

import { Resend } from 'resend';
import nodemailer from 'nodemailer';

export class NotificationService {
  constructor() {
    // Resend API (preferred — works on Railway, 3,000 free emails/month)
    this.resend = process.env.RESEND_API_KEY ? new Resend(process.env.RESEND_API_KEY) : null;

    // Nodemailer fallback (SMTP — may be blocked on Railway)
    this.transporter = null;
    if (!this.resend) {
      if (process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS) {
        this.transporter = nodemailer.createTransport({
          host: process.env.SMTP_HOST,
          port: Number(process.env.SMTP_PORT) || 587,
          secure: process.env.SMTP_SECURE === 'true',
          auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS }
        });
      } else if (process.env.GMAIL_USER && process.env.GMAIL_APP_PASSWORD) {
        this.transporter = nodemailer.createTransport({
          service: 'gmail',
          auth: { user: process.env.GMAIL_USER, pass: process.env.GMAIL_APP_PASSWORD }
        });
      }
    }

    console.log(`📧 [Email] Provider: ${this.resend ? 'Resend (HTTPS API)' : this.transporter ? 'Nodemailer (SMTP)' : 'NONE — emails will not be sent'}`);
  }

  /**
   * Dispatches order confirmation email to customer with Tracking & Invoice links.
   */
  async sendOrderConfirmationEmail(order) {
    if (!order || !order.user_email) return false;

    const items = Array.isArray(order.items) 
      ? order.items 
      : (typeof order.items_json === 'string' ? JSON.parse(order.items_json) : []);

    const itemsHtml = items.map(it => `
      <tr style="border-bottom: 1px solid #F0E6D8;">
        <td style="padding: 12px 8px; font-weight: 600; color: #3D2000;">
          ${it.name || it.id || 'Artisanal Baked Item'}
          ${it.packaging ? `<div style="font-size: 11px; color: #8C7355;">Packaging: ${it.packaging}</div>` : ''}
        </td>
        <td style="padding: 12px 8px; text-align: center; color: #705840;">×${it.quantity || 1}</td>
        <td style="padding: 12px 8px; text-align: right; font-weight: 700; color: #C8960C;">₹${(it.price || it.unit_price || 0) * (it.quantity || 1)}</td>
      </tr>
    `).join('');

    const baseUrl = process.env.BASE_URL || 'https://web-production-b66e7.up.railway.app';
    const invoiceUrl = `${baseUrl}/api/orders/${order.id}/invoice`;
    const trackingUrl = `${baseUrl}/track-order.html?order_id=${order.id}`;
    const isCOD = order.payment_method === 'Cash on Delivery' || order.payment_method === 'COD';
    const isPickup = order.delivery_mode === 'pickup' || (order.shipping_address && order.shipping_address.includes('Store Pickup:'));

    const htmlBody = `
      <!DOCTYPE html>
      <html>
      <head><meta charset="utf-8"><title>Order Confirmed - #${order.id}</title></head>
      <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; margin: 0; padding: 20px; background-color: #FAF6F0;">
        <div style="max-width: 600px; margin: 0 auto; background: #FFFFFF; border-radius: 16px; overflow: hidden; border: 1px solid #EADCCB; box-shadow: 0 8px 30px rgba(61,32,0,0.06);">
          <div style="background: linear-gradient(135deg, #3D2000 0%, #251300 100%); padding: 28px 24px; text-align: center; color: #FFF;">
            <h1 style="margin: 0; font-size: 24px; letter-spacing: 2px; color: #C8960C;">MING MORSELS</h1>
            <p style="margin: 4px 0 0 0; font-size: 12px; color: #D5C4B3; letter-spacing: 1.5px; text-transform: uppercase;">when moments matter</p>
          </div>
          <div style="padding: 32px 28px;">
            <h2 style="color: #3D2000; font-size: 20px; margin-top: 0;">Order Confirmed ✅ — #${order.id}</h2>
            <p style="color: #665241; line-height: 1.6;">Dear ${order.user_name || 'Connoisseur'}, your handcrafted artisanal selection has been accepted and is now entering our baking studio. 🍪</p>

            ${isCOD ? `
            <div style="background: #FFF8E1; border: 1.5px solid #F9A825; border-radius: 10px; padding: 14px 16px; margin: 0 0 20px 0;">
              <div style="font-weight: 700; color: #E65100; font-size: 14px; margin-bottom: 4px;">💵 Cash on Delivery / Pay at Store</div>
              <p style="margin: 0; font-size: 13px; color: #5D4037; line-height: 1.5;">Please keep <strong>₹${order.total_amount}</strong> ready at the time of ${isPickup ? 'pickup' : 'delivery'}. Our team will collect it when your order is handed to you.</p>
            </div>
            ` : ''}

            <table style="width: 100%; border-collapse: collapse; margin: 20px 0;">
              <thead>
                <tr style="border-bottom: 2px solid #EADCCB; color: #705840; font-size: 13px; text-transform: uppercase;">
                  <th style="padding: 8px; text-align: left;">Item</th>
                  <th style="padding: 8px; text-align: center;">Qty</th>
                  <th style="padding: 8px; text-align: right;">Amount</th>
                </tr>
              </thead>
              <tbody>
                ${itemsHtml}
              </tbody>
              <tfoot>
                <tr>
                  <td colspan="2" style="padding: 16px 8px; font-weight: 700; color: #3D2000; font-size: 16px;">${isCOD ? 'Amount to Pay' : 'Total Paid'}</td>
                  <td style="padding: 16px 8px; text-align: right; font-weight: 800; color: #C8960C; font-size: 18px;">₹${order.total_amount}</td>
                </tr>
              </tfoot>
            </table>

            ${isPickup ? `
            <div style="background: #F1F8E9; border-radius: 12px; border: 1px solid #A5D6A7; padding: 16px; margin: 24px 0;">
              <p style="margin: 0 0 6px 0; font-size: 12px; font-weight: 700; color: #388E3C; text-transform: uppercase;">🏪 Store Pickup Location</p>
              <p style="margin: 0 0 8px 0; font-size: 14px; color: #3D2000; font-weight: 600;">Ming Morsels Production House</p>
              <p style="margin: 0 0 10px 0; font-size: 13px; color: #5D4037; line-height: 1.5;">12th Main Road, HAL 2nd Stage, Indiranagar, Bengaluru - 560038</p>
              ${order.pickup_pin ? `<p style="margin: 0 0 10px 0; font-size: 14px; font-weight: 700; color: #C8960C; background: #FAF6F0; padding: 8px 12px; border-radius: 8px; display: inline-block;">🔑 Your Pickup PIN: ${order.pickup_pin}</p>` : ''}
              <p style="margin: 6px 0 0 0; font-size: 12px; color: #7B5E57;">⏱️ Your order will be freshly baked and ready in 2–3 hours.</p>
            </div>
            ` : `
            <div style="background: #FDFBF8; border-radius: 12px; border: 1px solid #EADCCB; padding: 16px; margin: 24px 0;">
              <p style="margin: 0 0 6px 0; font-size: 12px; font-weight: 700; color: #705840; text-transform: uppercase;">📦 Delivery Address</p>
              <p style="margin: 0; font-size: 14px; color: #3D2000;">${order.shipping_address || 'Express Bengaluru Delivery'}</p>
            </div>
            `}

            <!-- WhatsApp Updates -->
            <div style="text-align: center; margin: 20px 0;">
              <a href="https://wa.me/918884102020?text=${encodeURIComponent(`Hi Ming Morsels! I just placed Order #${order.id}. Please share live updates here.`)}" style="display: inline-block; background: #25D366; color: #FFF; padding: 13px 24px; border-radius: 10px; font-weight: 700; text-decoration: none; font-size: 14px;">💬 Get Live Updates on WhatsApp</a>
            </div>

            <div style="display: flex; gap: 12px; margin-top: 16px;">
              <a href="${trackingUrl}" style="display: inline-block; flex: 1; text-align: center; background: #C8960C; color: #120E0B; padding: 12px 16px; border-radius: 8px; font-weight: 700; text-decoration: none; font-size: 13px; text-transform: uppercase;">🚚 Track Live Order</a>
              <a href="${invoiceUrl}" style="display: inline-block; flex: 1; text-align: center; background: #FAF6F0; color: #3D2000; border: 1px solid #C8960C; padding: 12px 16px; border-radius: 8px; font-weight: 700; text-decoration: none; font-size: 13px; text-transform: uppercase;">📄 Download Tax Invoice</a>
            </div>
          </div>
        </div>
      </body>
      </html>
    `;

    if (this.resend) {
      try {
        console.log(`📧 [Resend] Sending order confirmation to: ${order.user_email}`);
        // Use verified domain if available, else Resend default sender
        const fromAddress = process.env.RESEND_FROM_EMAIL || 'Ming Morsels 🍪 <onboarding@resend.dev>';
        const { data, error } = await this.resend.emails.send({
          from: fromAddress,
          to: [order.user_email],
          subject: `✅ Order #${order.id} Confirmed | Ming Morsels — ${isCOD ? 'Cash on Delivery' : 'Payment Received'}`,
          html: htmlBody
        });
        if (error) {
          console.error(`❌ [Resend] Failed for ${order.user_email}:`, error);
          // Fall through to nodemailer if Resend fails
        } else {
          console.log(`✅ [Resend] Email sent to ${order.user_email}, id: ${data?.id}`);
          return true;
        }
      } catch (err) {
        console.error(`❌ [Resend] Exception:`, err.message);
      }
    }

    if (this.transporter) {
      try {
        console.log(`📧 [SMTP] Attempting to send order confirmation to: ${order.user_email}`);
        await this.transporter.sendMail({
          from: `"Ming Morsels Confectionery 🍪" <${process.env.SMTP_USER || process.env.GMAIL_USER || 'mingmorsels@gmail.com'}>`,
          to: order.user_email,
          subject: `✅ Order #${order.id} Confirmed | Ming Morsels — ${isCOD ? 'Cash on Delivery' : 'Payment Received'}`,
          html: htmlBody
        });
        console.log(`✅ [SMTP] Email sent to ${order.user_email} for order #${order.id}`);
        return true;
      } catch (err) {
        console.error(`❌ [SMTP] Failed to send to ${order.user_email}:`, err.message, '| Code:', err.code);
      }
    } else if (!this.resend) {
      console.warn(`⚠️ [Email] No provider configured! Set RESEND_API_KEY in Railway env vars.`);
    }

    return true;
  }

  /**
   * Dispatches SMS via Fast2SMS API to the customer's phone.
   * Requires FAST2SMS_API_KEY env variable.
   */
  async sendOrderConfirmationSMS(order) {
    if (!order) return;

    const rawPhone = order.user_phone || order.phone || order.shipping_phone || '';
    const phone = rawPhone.replace(/\D/g, '').slice(-10); // Extract last 10 digits
    const apiKey = process.env.FAST2SMS_API_KEY;

    const isPickup = order.delivery_mode === 'pickup' || (order.shipping_address && order.shipping_address.includes('Store Pickup:'));
    const isCOD = order.payment_method === 'Cash on Delivery' || order.payment_method === 'COD';

    const trackUrl = `https://web-production-b66e7.up.railway.app/track-order.html?order_id=${order.id}`;

    const smsMessage = isPickup
      ? `Hi ${order.user_name || 'there'}! Your Ming Morsels order #${order.id} (Rs.${order.total_amount}) is confirmed for Store Pickup at Indiranagar. ${isCOD ? `Keep Rs.${order.total_amount} ready. ` : ''}Ready in 2-3 hrs. Track: ${trackUrl}`
      : `Hi ${order.user_name || 'there'}! Your Ming Morsels order #${order.id} (Rs.${order.total_amount}) is confirmed! ${isCOD ? `Keep Rs.${order.total_amount} ready for COD. ` : ''}Delivery in 2-4 hrs. Track: ${trackUrl}`;

    if (!apiKey) {
      console.log(`📱 [SMS - No API Key] To ${phone}: ${smsMessage}`);
      return;
    }

    if (phone.length !== 10) {
      console.warn(`⚠️ [SMS] Skipping - invalid phone: "${rawPhone}"`);
      return;
    }

    try {
      const res = await fetch('https://www.fast2sms.com/dev/bulkV2', {
        method: 'POST',
        headers: {
          'authorization': apiKey,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          route: 'q',            // Quick transactional route (no DLT needed)
          message: smsMessage,
          language: 'english',
          flash: 0,
          numbers: phone
        }),
        signal: AbortSignal.timeout(8000)
      });

      const data = await res.json();
      if (data.return === true) {
        console.log(`✅ [SMS Sent] Order #${order.id} → +91${phone}`);
      } else {
        console.warn(`⚠️ [SMS Failed] Fast2SMS response:`, data);
      }
    } catch (err) {
      console.warn(`⚠️ [SMS Error] Could not send SMS to ${phone}:`, err.message);
    }
  }
}

export const notificationService = new NotificationService();
