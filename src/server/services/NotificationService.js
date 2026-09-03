// ─────────────────────────────────────────────────────────────────────────────
// Transactional Notification Service (Email & SMS with Live Tracking & Invoice)
// Uses Resend (HTTPS API) instead of SMTP — works on Railway without port blocks
// ─────────────────────────────────────────────────────────────────────────────

import { Resend } from 'resend';
import nodemailer from 'nodemailer';

export class NotificationService {
  constructor() {
    // Resend API (HTTPS — no port restrictions)
    this.resend = process.env.RESEND_API_KEY ? new Resend(process.env.RESEND_API_KEY) : null;

    // Gmail SMTP via port 465 (SSL) — always initialised as primary/fallback
    // Railway blocks port 587 (STARTTLS) but allows 465 (SSL)
    this.transporter = null;
    if (process.env.GMAIL_USER && process.env.GMAIL_APP_PASSWORD) {
      this.transporter = nodemailer.createTransport({
        host: 'smtp.gmail.com',
        port: 465,
        secure: true,  // SSL — works on Railway
        auth: { user: process.env.GMAIL_USER, pass: process.env.GMAIL_APP_PASSWORD }
      });
    } else if (process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS) {
      this.transporter = nodemailer.createTransport({
        host: process.env.SMTP_HOST,
        port: Number(process.env.SMTP_PORT) || 465,
        secure: true,
        auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS }
      });
    }

    const provider = this.resend ? 'Resend (primary) + Gmail SSL (fallback)' : this.transporter ? 'Gmail SSL port 465' : 'NONE';
    console.log(`📧 [Email] Provider: ${provider}`);
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
          ${it.packaging ? `<div style="font-size: 11px; color: #8C7355; margin-top: 2px;">📦 Packaging: ${it.packaging}</div>` : ''}
          ${it.details ? `<div style="font-size: 11px; color: #5B2C6F; margin-top: 2px;">🍬 Flavors: ${it.details}</div>` : ''}
          ${it.note ? `<div style="font-size: 11px; color: #8C5803; background: #FFF8EB; padding: 2px 6px; border-radius: 4px; margin-top: 3px;">💌 Note: "${it.note}"</div>` : ''}
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
      <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; margin: 0; padding: 24px; background-color: #FAF6F0;">
        <div style="max-width: 640px; margin: 0 auto; background: #FFFFFF; border-radius: 12px; overflow: hidden; border: 1px solid #EADCCB; box-shadow: 0 8px 30px rgba(61,32,0,0.06); padding: 32px 30px;">
          
          <!-- Official Corporate Letterhead Header -->
          <div style="border-bottom: 2.5px solid #EE6A43; padding-bottom: 20px; margin-bottom: 24px;">
            <table style="width: 100%; border-collapse: collapse; border: none;">
              <tr>
                <td style="width: 95px; vertical-align: middle; padding-right: 16px;">
                  <img src="https://web-production-b66e7.up.railway.app/logo.png?v=2" alt="mingmorsels" width="85" height="52" style="height: 52px; width: auto; max-width: 85px; object-fit: contain; display: block;" />
                </td>
                <td style="vertical-align: middle;">
                  <h1 style="margin: 0 0 4px 0; font-family: 'Times New Roman', Times, Georgia, serif; font-size: 22px; font-weight: 800; color: #3D2000; letter-spacing: 0.8px; text-transform: uppercase;">MIORA DELIGHTS PRIVATE LIMITED</h1>
                  <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; font-size: 11px; color: #333333; line-height: 1.45;">
                    Reg. office: Katha No.02, Mysore Road, Behind the Club, Nayandahalli, Bangalore, Karnataka-560039<br/>
                    <strong>CIN:</strong> U10711KA2026PTC216288 &nbsp;|&nbsp; <strong>Email:</strong> mingmorsels@gmail.com
                  </div>
                </td>
              </tr>
            </table>
          </div>

          <div>
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
              <p style="margin: 0 0 6px 0; font-size: 12px; font-weight: 700; color: #388E3C; text-transform: uppercase;">🏪 Store Pickup Details</p>
              <p style="margin: 0 0 8px 0; font-size: 14px; color: #3D2000; font-weight: 600;">Ming Morsels Production House</p>
              <p style="margin: 0 0 10px 0; font-size: 13px; color: #5D4037; line-height: 1.5;">1st A, Main Road, mingmorsels, 1st Cross Rd, SLV layout, Phase 3, Nayanda Halli, Bengaluru, Karnataka 560026</p>
              ${order.pickup_pin ? `<p style="margin: 0 0 10px 0; font-size: 14px; font-weight: 700; color: #C8960C; background: #FAF6F0; padding: 8px 12px; border-radius: 8px; display: inline-block;">🔑 Your Pickup PIN: ${order.pickup_pin}</p>` : ''}
              
              ${(new Date(order.created_at || Date.now()).getDay() === 0) ? `
              <div style="background: #FFF3CD; border: 1.5px solid #FFEBAA; border-radius: 8px; padding: 10px 12px; margin-top: 10px;">
                <p style="margin: 0; font-size: 12.5px; font-weight: 700; color: #856404;">⚠️ Sunday Holiday Notice:</p>
                <p style="margin: 4px 0 0; font-size: 12px; color: #664D03; line-height: 1.45;">
                  Sunday is a holiday for store pickup. Your freshly baked treats will be ready for collection <strong>tomorrow on Monday between 10:00 AM and 4:00 PM</strong>.
                </p>
              </div>
              ` : `
              <p style="margin: 6px 0 0 0; font-size: 12px; color: #7B5E57;">🕒 <strong>Pickup Hours:</strong> 10:00 AM – 4:00 PM (Monday – Saturday). Ready in 2–3 hours. <em>(Sunday is a weekly holiday)</em>.</p>
              `}
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
   * Dispatches instant new order notification email to Admin (mingmorsels@gmail.com).
   */
  async sendAdminNewOrderAlert(order) {
    if (!order) return false;

    const adminEmail = process.env.ADMIN_EMAIL || process.env.GMAIL_USER || 'mingmorsels@gmail.com';
    const items = Array.isArray(order.items) 
      ? order.items 
      : (typeof order.items_json === 'string' ? JSON.parse(order.items_json) : []);

    const isPickup = order.delivery_mode === 'pickup' || (order.shipping_address && order.shipping_address.includes('Store Pickup:'));
    const baseUrl = process.env.BASE_URL || 'https://www.mingmorsels.com';
    const adminUrl = `${baseUrl}/admin.html`;

    const itemsHtml = items.map(it => {
      const qty = Number(it.quantity || it.qty || 1);
      const rawName = String(it.name || it.id || 'Artisanal Baked Item').trim();
      const packaging = String(it.packaging || it.packaging_tier || '').trim();
      const combined = `${rawName} ${packaging} ${it.id || ''}`.toLowerCase();

      let cleanFlavor = rawName.replace(/\s*\([^)]*\)/g, '').replace(/\s*\+.*$/i, '').trim();
      if (!cleanFlavor) cleanFlavor = rawName;

      const isMuffin = rawName.toLowerCase().includes('muffin') || cleanFlavor.toLowerCase().includes('muffin');
      const unitLabel = isMuffin ? 'Muffins' : 'Cookies';

      let tierName = 'Classic Delights';
      let piecesPerBox = isMuffin ? 4 : 8;
      if (combined.includes('dozen') || combined.includes('12')) {
        tierName = 'Dozen Delights';
        piecesPerBox = isMuffin ? 6 : 12;
      } else if (combined.includes('twin') || combined.includes('snack') || combined.includes('2')) {
        tierName = 'Twin Delights';
        piecesPerBox = 2;
      }

      let giftBox = 'Standard Bakery Pack (Included)';
      if (combined.includes('lush')) giftBox = '✨ Lush Luxury Gift Box (+ Dry Fruits)';
      else if (combined.includes('signature') || combined.includes('+₹15')) giftBox = '🎁 Signature Treat Box';
      else if (combined.includes('custom_box') || combined.includes('gift')) giftBox = '🎀 Custom Curated Gift Box';

      const details = it.details ? `<div style="font-size: 12px; color: #5B2C6F; margin-top: 4px;">🍬 <strong>Curated Flavors:</strong> ${it.details}</div>` : '';
      const note = (it.note || it.customMessage || it.giftNote) ? `
        <div style="font-size: 12px; color: #8C5803; background: #FFF8EB; border: 1px solid #FEEBC8; padding: 6px 10px; border-radius: 6px; margin-top: 6px;">
          💌 <strong>Customer Gift Message / Note:</strong> "${it.note || it.customMessage || it.giftNote}"
        </div>` : '';

      return `
        <tr style="border-bottom: 1.5px solid #F0E6D8;">
          <td style="padding: 12px 10px; color: #3D2000; vertical-align: top;">
            <strong style="font-size: 14px; color: #1A0D00;">${cleanFlavor}</strong>
            <div style="font-size: 12px; color: #8C5803; font-weight: 600; margin-top: 3px;">
              Tier: <strong>${tierName}</strong> (${piecesPerBox} ${unitLabel} / box)
            </div>
            <div style="font-size: 12px; color: #555; margin-top: 2px;">
              Packaging: <strong>${giftBox}</strong>
            </div>
            ${details}
            ${note}
          </td>
          <td style="padding: 12px 10px; text-align: center; font-weight: 800; font-size: 14px; color: #3D2000; vertical-align: top;">×${qty}</td>
          <td style="padding: 12px 10px; text-align: right; font-weight: 800; font-size: 14px; color: #C8960C; vertical-align: top;">₹${(it.price || it.unit_price || 0) * qty}</td>
        </tr>
      `;
    }).join('');

    const htmlBody = `
      <!DOCTYPE html>
      <html>
      <head><meta charset="utf-8"><title>New Order #${order.id}</title></head>
      <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; margin: 0; padding: 24px; background-color: #FAF6F0;">
        <div style="max-width: 640px; margin: 0 auto; background: #FFFFFF; border-radius: 14px; overflow: hidden; border: 1.5px solid #EADCCB; box-shadow: 0 8px 30px rgba(61,32,0,0.08); padding: 32px 28px;">
          
          <!-- Header Banner -->
          <div style="background: linear-gradient(135deg, #3D2000 0%, #1A0D00 100%); color: #FFF; padding: 18px 22px; border-radius: 10px; margin-bottom: 24px;">
            <div style="font-size: 11px; text-transform: uppercase; letter-spacing: 1.5px; color: #E0AB1E; font-weight: 800;">ADMIN STORE ALERT</div>
            <h1 style="margin: 6px 0 0; font-size: 22px; font-weight: 800; color: #FFF;">🚨 New Order Received — #${order.id}</h1>
          </div>

          <!-- Customer & Order Overview Grid -->
          <div style="background: #FFFDF9; border: 1px solid #F0E6D8; border-radius: 10px; padding: 16px; margin-bottom: 22px;">
            <table style="width: 100%; border-collapse: collapse; font-size: 13px; line-height: 1.6;">
              <tr>
                <td style="color: #8C7355; width: 35%;">Customer Name:</td>
                <td style="font-weight: 700; color: #3D2000;">${order.user_name || 'Valued Customer'}</td>
              </tr>
              <tr>
                <td style="color: #8C7355;">Email:</td>
                <td style="font-weight: 600; color: #3D2000;"><a href="mailto:${order.user_email}" style="color: #C8960C; text-decoration: none;">${order.user_email || 'N/A'}</a></td>
              </tr>
              <tr>
                <td style="color: #8C7355;">Phone:</td>
                <td style="font-weight: 600; color: #3D2000;">${order.user_phone || 'N/A'}</td>
              </tr>
              <tr>
                <td style="color: #8C7355;">Fulfillment:</td>
                <td style="font-weight: 700; color: ${isPickup ? '#1E824C' : '#2980B9'};">
                  ${isPickup ? `🏪 Store Pickup (Counter PIN: ${order.pickup_pin || '----'})` : '🚚 Express Courier Delivery'}
                </td>
              </tr>
              <tr>
                <td style="color: #8C7355;">Delivery Address:</td>
                <td style="color: #3D2000;">${order.shipping_address || 'Express Bengaluru Delivery'}</td>
              </tr>
              <tr>
                <td style="color: #8C7355;">Payment Status:</td>
                <td style="font-weight: 700; color: #1E824C;">✅ PAID (${order.payment_method || 'Razorpay / UPI'})</td>
              </tr>
              <tr>
                <td style="color: #8C7355;">Total Amount:</td>
                <td style="font-size: 17px; font-weight: 900; color: #8C5803;">₹${order.total_amount}</td>
              </tr>
            </table>
          </div>

          <!-- Items Ordered Section -->
          <h2 style="font-size: 16px; color: #3D2000; margin: 0 0 12px; border-bottom: 2px solid #C8960C; padding-bottom: 6px;">
            📦 Items &amp; Gift Packaging To Prepare (${items.length} item${items.length === 1 ? '' : 's'})
          </h2>

          <table style="width: 100%; border-collapse: collapse; margin-bottom: 24px;">
            <thead>
              <tr style="background: #F8EFE4; font-size: 12px; color: #705840; text-transform: uppercase;">
                <th style="padding: 8px 10px; text-align: left;">Item &amp; Packaging Details</th>
                <th style="padding: 8px 10px; text-align: center;">Qty</th>
                <th style="padding: 8px 10px; text-align: right;">Amount</th>
              </tr>
            </thead>
            <tbody>
              ${itemsHtml}
            </tbody>
          </table>

          <!-- Direct Admin Dispatch CTA Button -->
          <div style="text-align: center; margin-top: 28px;">
            <a href="${adminUrl}" style="display: inline-block; background: linear-gradient(135deg, #C8960C 0%, #E0AB1E 100%); color: #1A0D00; font-weight: 800; padding: 14px 28px; border-radius: 8px; text-decoration: none; font-size: 14px; text-transform: uppercase; letter-spacing: 0.5px; box-shadow: 0 4px 15px rgba(200,150,12,0.3);">
              👉 Open Admin Operations Portal to Dispatch Order →
            </a>
          </div>

        </div>
      </body>
      </html>
    `;

    const subject = `🚨 New Order Alert! #${order.id} (₹${order.total_amount}) — ${order.user_name || 'Customer'}`;

    if (this.resend) {
      try {
        console.log(`📧 [Resend Admin Alert] Sending to: ${adminEmail}`);
        const fromAddress = process.env.RESEND_FROM_EMAIL || 'Ming Morsels Orders 🍪 <onboarding@resend.dev>';
        const { data, error } = await this.resend.emails.send({
          from: fromAddress,
          to: [adminEmail],
          subject: subject,
          html: htmlBody
        });
        if (error) {
          console.error(`❌ [Resend Admin Alert] Resend API error for ${adminEmail}:`, error);
        } else {
          console.log(`✅ [Resend Admin Alert] Sent to ${adminEmail} for order #${order.id}, id: ${data?.id}`);
          return true;
        }
      } catch (err) {
        console.error(`❌ [Resend Admin Alert] Exception:`, err.message);
      }
    }

    if (this.transporter) {
      try {
        console.log(`📧 [SMTP Admin Alert] Attempting to send to: ${adminEmail}`);
        await this.transporter.sendMail({
          from: `"Ming Morsels Store Bot 🍪" <${process.env.SMTP_USER || process.env.GMAIL_USER || 'mingmorsels@gmail.com'}>`,
          to: adminEmail,
          subject: subject,
          html: htmlBody
        });
        console.log(`✅ [SMTP Admin Alert] Sent to ${adminEmail} for order #${order.id}`);
        return true;
      } catch (err) {
        console.error(`❌ [SMTP Admin Alert] Failed to send to ${adminEmail}:`, err.message);
      }
    }

    return false;
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

    const isSundayOrder = (new Date(order.created_at || Date.now()).getDay() === 0);
    const pickupTimingText = isSundayOrder
      ? 'Note: Sunday is holiday for store pickup. Collect tomorrow Monday (10AM-4PM).'
      : 'Pickup Hours: 10AM-4PM (Mon-Sat, Sunday closed). Ready in 2-3 hrs.';

    const smsMessage = isPickup
      ? `Hi ${order.user_name || 'there'}! Your Ming Morsels order #${order.id} (Rs.${order.total_amount}) is confirmed for Store Pickup at Nayanda Halli Studio. PIN: ${order.pickup_pin || '4892'}. ${pickupTimingText} ${isCOD ? `Keep Rs.${order.total_amount} ready. ` : ''}Track: ${trackUrl}`
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
