// ----------------------------------------------------
// Google Analytics 4 (GA4) E-Commerce Event Tracker
// ----------------------------------------------------

export const Analytics = {
  // 1. Product Details Viewed
  trackViewItem(product) {
    if (!product) return;
    const eventData = {
      currency: 'INR',
      value: Number(product.price) || 180,
      items: [{
        item_id: product.id,
        item_name: product.name,
        price: Number(product.price) || 180,
        item_category: product.type || 'Cookie'
      }]
    };

    this.sendEvent('view_item', eventData);
  },

  // 2. Added Item to Cart
  trackAddToCart(item, quantity = 1) {
    if (!item) return;
    const eventData = {
      currency: 'INR',
      value: (Number(item.price) || 180) * (Number(quantity) || 1),
      items: [{
        item_id: item.id,
        item_name: item.name,
        price: Number(item.price) || 180,
        quantity: Number(quantity) || 1
      }]
    };

    this.sendEvent('add_to_cart', eventData);
  },

  // 3. Began Checkout
  trackBeginCheckout(items, totalAmount) {
    const eventData = {
      currency: 'INR',
      value: Number(totalAmount) || 0,
      items: (items || []).map((it) => ({
        item_id: it.id,
        item_name: it.name,
        price: Number(it.price) || 180,
        quantity: Number(it.quantity) || 1
      }))
    };

    this.sendEvent('begin_checkout', eventData);
  },

  // 4. Completed Purchase
  trackPurchase(orderId, items, totalAmount, paymentId) {
    const eventData = {
      transaction_id: orderId,
      value: Number(totalAmount) || 0,
      currency: 'INR',
      payment_type: paymentId || 'Razorpay Online',
      items: (items || []).map((it) => ({
        item_id: it.id,
        item_name: it.name,
        price: Number(it.price) || 180,
        quantity: Number(it.quantity) || 1
      }))
    };

    this.sendEvent('purchase', eventData);
  },

  // Internal Dispatch
  sendEvent(eventName, params) {
    if (typeof window !== 'undefined' && typeof window.gtag === 'function') {
      window.gtag('event', eventName, params);
    } else if (typeof window !== 'undefined' && Array.isArray(window.dataLayer)) {
      window.dataLayer.push({ event: eventName, ...params });
    }
    // Debug log in dev
    console.log(`📊 [GA4 E-Commerce Event]: ${eventName}`, params);
  }
};
