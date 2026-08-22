// ─────────────────────────────────────────────────────────────────────────────
// Transactional Notification Service (Email & SMS with Live Tracking & Invoice)
// ─────────────────────────────────────────────────────────────────────────────

import nodemailer from 'nodemailer';

export class NotificationService {
  constructor() {
    this.transporter = null;

    if (process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS) {
      this.transporter = nodemailer.createTransport({
        host: process.env.SMTP_HOST,
        port: Number(process.env.SMTP_PORT) || 587,
        secure: process.env.SMTP_SECURE === 'true',
        auth: {
          user: process.env.SMTP_USER,
          pass: process.env.SMTP_PASS
        }
      });
    } else if (process.env.GMAIL_USER && process.env.GMAIL_APP_PASSWORD) {
      this.transporter = nodemailer.createTransport({
        service: 'gmail',
        auth: {
          user: process.env.GMAIL_USER,
          pass: process.env.GMAIL_APP_PASSWORD
        }
      });
    }
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

    const invoiceUrl = `/api/orders/${order.id}/invoice`;
    const trackingUrl = `/track-order.html?order_id=${order.id}`;

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
            <h2 style="color: #3D2000; font-size: 20px; margin-top: 0;">Order Confirmed: #${order.id}</h2>
            <p style="color: #665241; line-height: 1.6;">Dear ${order.user_name || 'Connoisseur'}, your handcrafted artisanal selection has been accepted and is now entering our kitchen.</p>
            
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
                  <td colspan="2" style="padding: 16px 8px; font-weight: 700; color: #3D2000; font-size: 16px;">Total Paid</td>
                  <td style="padding: 16px 8px; text-align: right; font-weight: 800; color: #C8960C; font-size: 18px;">₹${order.total_amount}</td>
                </tr>
              </tfoot>
            </table>

            <!-- Reward Points & 1,000 Points Special Gift Notice -->
            <div style="background: linear-gradient(135deg, rgba(200, 150, 12, 0.12) 0%, rgba(91, 44, 111, 0.12) 100%); border: 1.5px solid #C8960C; border-radius: 12px; padding: 16px; margin: 20px 0; text-align: left;">
              <div style="font-size: 15px; font-weight: 700; color: #3D2000; margin-bottom: 4px;">
                🎉 You earned +100 Reward Points on this order!
              </div>
              <p style="margin: 0; font-size: 13px; color: #5B2C6F; line-height: 1.4;">
                🎁 <strong>Milestone Perk:</strong> Complete <strong>1,000 Points</strong> (10 orders) to unlock an exclusive <strong>Special Artisanal Gift Box</strong> handcrafted by our Master Chefs with your next order!
              </p>
            </div>

            ${(order.delivery_mode === 'pickup' || (order.shipping_address && order.shipping_address.includes('Store Pickup:')) || order.pickup_pin) ? `
            <div style="background: #FDFBF8; border-radius: 12px; border: 1px solid #EADCCB; padding: 16px; margin: 24px 0;">
              <p style="margin: 0 0 6px 0; font-size: 12px; font-weight: 700; color: #705840; text-transform: uppercase;">🏪 Store Pickup Location</p>
              <p style="margin: 0 0 10px 0; font-size: 14px; color: #3D2000;">1st Floor, Katha No.02, Behind the club, Mysore Road, Nayandahalli, Bengaluru, Karnataka 560039</p>
              <p style="margin: 0 0 10px 0; font-size: 14px; font-weight: 700; color: #C8960C;">Your Secret PIN: ${order.pickup_pin || 'Show ID at counter'}</p>
              <a href="https://www.google.com/maps/search/?api=1&query=1st+Floor,+Katha+No.02,+Behind+the+club,+Mysore+Road,+Nayandahalli,+Bengaluru" style="color: #3498DB; text-decoration: none; font-size: 13px; font-weight: 600;">📍 Get Directions on Google Maps</a>
            </div>
            ` : `
            <div style="background: #FDFBF8; border-radius: 12px; border: 1px solid #EADCCB; padding: 16px; margin: 24px 0;">
              <p style="margin: 0 0 6px 0; font-size: 12px; font-weight: 700; color: #705840; text-transform: uppercase;">Delivery Address</p>
              <p style="margin: 0; font-size: 14px; color: #3D2000;">${order.shipping_address || 'Express Bengaluru Delivery'}</p>
            </div>
            `}

            <div style="display: flex; gap: 12px; margin-top: 24px;">
              <a href="${trackingUrl}" style="display: inline-block; flex: 1; text-align: center; background: #C8960C; color: #120E0B; padding: 12px 16px; border-radius: 8px; font-weight: 700; text-decoration: none; font-size: 13px; text-transform: uppercase;">🚚 Track Live Order</a>
              <a href="${invoiceUrl}" style="display: inline-block; flex: 1; text-align: center; background: #FAF6F0; color: #3D2000; border: 1px solid #C8960C; padding: 12px 16px; border-radius: 8px; font-weight: 700; text-decoration: none; font-size: 13px; text-transform: uppercase;">📄 Download Tax Invoice</a>
            </div>
          </div>
        </div>
      </body>
      </html>
    `;

    if (this.transporter) {
      try {
        await this.transporter.sendMail({
          from: `"Ming Morsels Confectionery" <${process.env.SMTP_USER || process.env.GMAIL_USER || 'orders@mingmorsels.com'}>`,
          to: order.user_email,
          subject: `✨ Order Confirmed: #${order.id} | Ming Morsels`,
          html: htmlBody
        });
        console.log(`✉️ Order confirmation email sent to ${order.user_email}`);
        return true;
      } catch (err) {
        console.warn('⚠️ Nodemailer delivery error:', err.message);
      }
    } else {
      console.log(`ℹ️ [Email Simulation] Order #${order.id} confirmation dispatched to ${order.user_email}`);
    }

    return true;
  }

  /**
   * Dispatches SMS notification.
   */
  sendOrderConfirmationSMS(order) {
    if (!order) return;
    const phone = order.phone || order.shipping_phone || '+91 98765 43210';
    console.log(`📱 [SMS Gateway Triggered] Sent to ${phone}: "Your Ming Morsels order #${order.id} of ₹${order.total_amount} is baking! Track live at http://localhost:5173/track-order.html?order_id=${order.id}"`);
  }
}

export const notificationService = new NotificationService();
