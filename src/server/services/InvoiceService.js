// ─────────────────────────────────────────────────────────────────────────────
// Ming Morsels - GST Tax Invoice Generation Service (HSN 1905 Compliant)
// ─────────────────────────────────────────────────────────────────────────────

export class InvoiceService {
  static COMPANY_DETAILS = {
    legalName: 'MIORA DELIGHTS PRIVATE LIMITED',
    brandName: 'Ming Morsels (Miora Delights Pvt. Ltd.)',
    tagline: 'Artisanal Confectionery & Handcrafted Luxury Cookies',
    address: '1st Floor, Katha No.02, Behind the club, Mysore Road, Nayandahalli, Bengaluru Urban, Karnataka - 560039',
    gstin: '29AAUCM5423C1Z9',
    pan: 'AAUCM5423C',
    fssai: '11223334000555',
    state: 'Karnataka (Code: 29)',
    email: 'concierge@mingmorsels.com',
    phone: '+91 8884102020'
  };

  /**
   * Builds GST Breakdown for line items
   */
  static computeGstBreakdown(order) {
    const items = order.items || [];
    const subtotal = Number(order.total_amount || 0);
    const discount = Number(order.discount_amount || 0);
    const taxGST = Number(order.tax_gst || Math.round((subtotal - discount) * 0.05));
    const delivery = Number(order.delivery_fee || 0);

    const cgst = Math.round((taxGST / 2) * 100) / 100;
    const sgst = Math.round((taxGST / 2) * 100) / 100;

    return {
      subtotal,
      discount,
      taxableAmount: Math.max(0, subtotal - discount),
      taxGST,
      cgst,
      sgst,
      delivery,
      grandTotal: Math.max(0, subtotal - discount + taxGST + delivery)
    };
  }

  /**
   * Generates a printable, GST-compliant luxury HTML invoice
   */
  static generateInvoiceHtml(order) {
    const company = this.COMPANY_DETAILS;
    const gst = this.computeGstBreakdown(order);
    const invoiceDate = new Date(order.created_at || Date.now()).toLocaleDateString('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric'
    });

    const itemsRows = (order.items || []).map((it, idx) => {
      const qty = it.quantity || 1;
      const rate = it.price || 140;
      const total = qty * rate;
      return `
        <tr>
          <td style="padding: 12px; border-bottom: 1px solid #f0e6d2; text-align: center; color: #666;">${idx + 1}</td>
          <td style="padding: 12px; border-bottom: 1px solid #f0e6d2;">
            <strong style="color: #2b1810; font-size: 14px;">${it.name || it.id || 'Artisanal Cookie'}</strong>
            ${it.packaging ? `<div style="font-size: 11px; color: #8c7355; margin-top: 2px;">Packaging: ${it.packaging}</div>` : ''}
          </td>
          <td style="padding: 12px; border-bottom: 1px solid #f0e6d2; text-align: center; color: #555;">1905.90</td>
          <td style="padding: 12px; border-bottom: 1px solid #f0e6d2; text-align: center; color: #555;">${qty}</td>
          <td style="padding: 12px; border-bottom: 1px solid #f0e6d2; text-align: right; color: #555;">₹${rate.toFixed(2)}</td>
          <td style="padding: 12px; border-bottom: 1px solid #f0e6d2; text-align: right; font-weight: 600; color: #2b1810;">₹${total.toFixed(2)}</td>
        </tr>
      `;
    }).join('');

    return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>Tax Invoice - ${order.id} | Ming Morsels</title>
  <style>
    body {
      font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif;
      margin: 0;
      padding: 40px;
      background: #faf8f5;
      color: #333;
    }
    .invoice-card {
      max-width: 800px;
      margin: 0 auto;
      background: #ffffff;
      border: 1px solid #e8decb;
      border-radius: 12px;
      padding: 40px;
      box-shadow: 0 10px 30px rgba(0,0,0,0.05);
    }
    .header {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      border-bottom: 2px solid #d4af37;
      padding-bottom: 24px;
      margin-bottom: 28px;
    }
    .brand-title {
      font-size: 26px;
      font-weight: 700;
      letter-spacing: 2px;
      color: #3c1518;
      text-transform: uppercase;
      margin: 0 0 6px 0;
    }
    .brand-sub {
      font-size: 12px;
      color: #8c7355;
      letter-spacing: 1px;
      text-transform: uppercase;
    }
    .invoice-badge {
      text-align: right;
    }
    .invoice-badge h2 {
      margin: 0;
      font-size: 20px;
      color: #3c1518;
      letter-spacing: 1px;
    }
    .invoice-badge p {
      margin: 4px 0 0 0;
      font-size: 13px;
      color: #666;
    }
    .meta-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 30px;
      margin-bottom: 30px;
      font-size: 13px;
      line-height: 1.6;
    }
    .meta-box h4 {
      margin: 0 0 8px 0;
      font-size: 12px;
      text-transform: uppercase;
      letter-spacing: 1px;
      color: #8c7355;
      border-bottom: 1px solid #f0e6d2;
      padding-bottom: 4px;
    }
    table {
      width: 100%;
      border-collapse: collapse;
      margin-bottom: 30px;
    }
    th {
      background: #faf6f0;
      color: #3c1518;
      font-size: 12px;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      padding: 12px;
      border-bottom: 2px solid #e8decb;
    }
    .totals-area {
      display: flex;
      justify-content: flex-end;
      margin-bottom: 30px;
    }
    .totals-table {
      width: 320px;
      font-size: 13px;
    }
    .totals-table td {
      padding: 6px 0;
    }
    .totals-table .grand-total {
      font-size: 16px;
      font-weight: 700;
      color: #3c1518;
      border-top: 2px solid #d4af37;
      padding-top: 10px;
    }
    .footer-note {
      border-top: 1px solid #f0e6d2;
      padding-top: 20px;
      font-size: 11px;
      color: #888;
      text-align: center;
      line-height: 1.5;
    }
    .print-btn {
      display: block;
      margin: 0 auto 20px auto;
      padding: 10px 24px;
      background: #3c1518;
      color: #fff;
      border: 1px solid #d4af37;
      border-radius: 6px;
      font-size: 13px;
      font-weight: 600;
      cursor: pointer;
      letter-spacing: 1px;
      text-transform: uppercase;
    }
    @media print {
      body {
        padding: 0;
        background: #fff;
      }
      .invoice-card {
        box-shadow: none;
        border: none;
        padding: 0;
      }
      .print-btn {
        display: none;
      }
    }
  </style>
</head>
<body>
  <button class="print-btn" onclick="window.print()">🖨️ Print / Download PDF Invoice</button>
  <div class="invoice-card">
    <div class="header">
      <div>
        <h1 class="brand-title">Ming Morsels</h1>
        <div class="brand-sub">${company.legalName} • ${company.tagline}</div>
        <div style="font-size: 12px; color: #555; margin-top: 6px; line-height: 1.4;">
          ${company.address}<br>
          GSTIN: <strong>${company.gstin}</strong> | PAN: <strong>${company.pan}</strong> | FSSAI: ${company.fssai}
        </div>
      </div>
      <div class="invoice-badge">
        <h2>TAX INVOICE</h2>
        <p><strong>Invoice No:</strong> INV-${order.id}</p>
        <p><strong>Order Ref:</strong> ${order.id}</p>
        <p><strong>Date:</strong> ${invoiceDate}</p>
        <p><strong>Status:</strong> <span style="color: green; font-weight: bold;">${order.payment_status || 'PAID'}</span></p>
      </div>
    </div>

    <div class="meta-grid">
      <div class="meta-box">
        <h4>Billed & Shipped To:</h4>
        <strong>${order.user_name || 'Connoisseur'}</strong><br>
        Email: ${order.user_email}<br>
        Address: ${order.shipping_address || 'Express Bengaluru Delivery'}<br>
        Place of Supply: Karnataka (29)
      </div>
      <div class="meta-box">
        <h4>Payment & Fulfillment:</h4>
        Payment Method: Razorpay Secure<br>
        Payment ID: ${order.payment_id || 'RZP_' + order.id}<br>
        AWB / Courier: ${order.shipway_awb || 'SW-LOCAL'} (${order.courier_name || 'BlueDart Express'})<br>
        Delivery Status: ${order.delivery_status || 'BAKING'}
      </div>
    </div>

    <table>
      <thead>
        <tr>
          <th style="width: 40px; text-align: center;">#</th>
          <th style="text-align: left;">Item Description</th>
          <th style="text-align: center; width: 80px;">HSN</th>
          <th style="text-align: center; width: 60px;">Qty</th>
          <th style="text-align: right; width: 90px;">Unit Price</th>
          <th style="text-align: right; width: 100px;">Amount</th>
        </tr>
      </thead>
      <tbody>
        ${itemsRows}
      </tbody>
    </table>

    <div class="totals-area">
      <table class="totals-table">
        <tr>
          <td>Taxable Subtotal:</td>
          <td style="text-align: right; font-weight: 600;">₹${gst.subtotal.toFixed(2)}</td>
        </tr>
        ${gst.discount > 0 ? `
        <tr>
          <td style="color: #27ae60;">Discount Applied:</td>
          <td style="text-align: right; color: #27ae60;">-₹${gst.discount.toFixed(2)}</td>
        </tr>` : ''}
        <tr>
          <td>CGST (2.5%):</td>
          <td style="text-align: right;">₹${gst.cgst.toFixed(2)}</td>
        </tr>
        <tr>
          <td>SGST (2.5%):</td>
          <td style="text-align: right;">₹${gst.sgst.toFixed(2)}</td>
        </tr>
        <tr>
          <td>Delivery / White-Glove Fee:</td>
          <td style="text-align: right;">₹${gst.delivery.toFixed(2)}</td>
        </tr>
        <tr class="grand-total">
          <td>Grand Total:</td>
          <td style="text-align: right;">₹${gst.grandTotal.toFixed(2)}</td>
        </tr>
      </table>
    </div>

    <div class="footer-note">
      This is a computer-generated GST tax invoice. No signature is required.<br>
      Thank you for indulging in handcrafted confectionery by Ming Morsels Artisanal Bangalore.
    </div>
  </div>
</body>
</html>
    `;
  }
}
