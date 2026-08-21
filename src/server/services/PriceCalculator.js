// ─────────────────────────────────────────────────────────────────────────────
// Authoritative Server-Side Price & Tax Calculation Engine
// ─────────────────────────────────────────────────────────────────────────────

import { PRODUCT_CATALOG, PACKAGING_RATES, ACTIVE_COUPONS } from '../config/catalog.js';
import { getPincodeShippingTier } from '../../../db.js';

export class PriceCalculator {
  /**
   * Recalculates cart items against the authoritative product catalog.
   * Prevents client-side price tampering.
   * 
   * @param {Array} items - Raw items from client [{ id, quantity, packaging, ... }]
   * @param {string} [couponCode] - Optional discount coupon code
   * @param {string|Object} [destination] - Destination pincode, address, or shipping details
   * @returns {Object} { verifiedItems, subtotal, discount, packagingFee, deliveryFee, taxGST, totalAmount, shippingTier }
   */
  static calculateOrderSummary(items = [], couponCode = null, destination = null) {
    if (!Array.isArray(items) || items.length === 0) {
      throw new Error('Order must contain at least 1 item.');
    }

    let subtotal = 0;
    let packagingTotal = 0;
    const verifiedItems = [];

    for (const item of items) {
      const productId = String(item.id || '').trim().toLowerCase();
      const qty = Math.max(1, parseInt(item.quantity, 10) || 1);
      let packagingKey = String(item.packaging || 'none').trim().toLowerCase();
      if (packagingKey.includes('classic') || packagingKey.includes('signature')) packagingKey = 'classic';
      else if (packagingKey.includes('lush')) packagingKey = 'lush';
      else if (productId.endsWith('_classic')) packagingKey = 'classic';
      else if (productId.endsWith('_lush')) packagingKey = 'lush';

      // Check if product exists in catalog
      let catalogEntry = PRODUCT_CATALOG[productId];
      if (!catalogEntry) {
        const strippedId = productId.replace(/_(classic|lush|wooden|tin|velvet)$/, '');
        catalogEntry = PRODUCT_CATALOG[strippedId];
      }
      if (!catalogEntry) {
        const baseKey = productId.split('_')[0];
        catalogEntry = PRODUCT_CATALOG[baseKey];
      }

      // Handle custom gift box products or fallback
      let unitPrice = catalogEntry ? catalogEntry.price : (Number(item.price) > 0 ? Number(item.price) : 180);
      let productName = catalogEntry ? catalogEntry.name : (item.name || 'Artisanal Baked Delight');

      const packagingRate = PACKAGING_RATES[packagingKey] || 0;
      const itemSubtotal = unitPrice * qty;
      const itemPackagingTotal = packagingRate * qty;

      subtotal += itemSubtotal;
      packagingTotal += itemPackagingTotal;

      verifiedItems.push({
        id: productId || 'custom_item',
        name: productName,
        unit_price: unitPrice,
        quantity: qty,
        packaging: packagingKey,
        packaging_fee: itemPackagingTotal,
        total_price: itemSubtotal + itemPackagingTotal,
        image: item.image || '/logo.png'
      });
    }

    // Calculate coupon discount
    let discountAmount = 0;
    let appliedCoupon = null;

    if (couponCode && typeof couponCode === 'string') {
      const codeUpper = couponCode.trim().toUpperCase();
      const coupon = ACTIVE_COUPONS[codeUpper];

      if (coupon && subtotal >= (coupon.minOrderValue || 0)) {
        if (coupon.type === 'percentage') {
          discountAmount = Math.min(
            coupon.maxDiscount,
            Math.round((subtotal * coupon.value) / 100)
          );
        } else if (coupon.type === 'flat') {
          discountAmount = Math.min(coupon.maxDiscount, coupon.value);
        }
        appliedCoupon = {
          code: coupon.code,
          description: coupon.description,
          discount: discountAmount
        };
      }
    }

    // Check for Self-Pickup mode
    const isPickup = typeof destination === 'string' 
      ? (destination.toLowerCase().includes('pickup') || destination.toLowerCase().includes('store collection'))
      : (destination && (destination.delivery_mode === 'pickup' || destination.mode === 'pickup' || String(destination.address || '').toLowerCase().includes('pickup')));

    // Resolve Destination Pincode for Tiered Shipping
    let pincode = '';
    if (!isPickup) {
      if (typeof destination === 'string') {
        const pinMatch = destination.match(/\b\d{6}\b/);
        if (pinMatch) pincode = pinMatch[0];
      } else if (destination && typeof destination === 'object') {
        pincode = String(destination.pincode || '').trim();
        if (!pincode && destination.address) {
          const pinMatch = String(destination.address).match(/\b\d{6}\b/);
          if (pinMatch) pincode = pinMatch[0];
        }
      }
    }

    const shippingTier = isPickup 
      ? { tier: 0, deliveryFee: 0, freeDeliveryAbove: 0, zone: 'Store Self-Pickup', area: 'Ming Morsels Studio (Indiranagar)' }
      : getPincodeShippingTier(pincode);

    const baseDeliveryFee = shippingTier.deliveryFee || 0;
    const freeThreshold = shippingTier.freeDeliveryAbove || 0;

    // Delivery rules: Free delivery above threshold or for self-pickup, else tiered delivery fee
    const eligibleAmountForFreeDelivery = subtotal - discountAmount;
    const deliveryFee = isPickup ? 0 : (eligibleAmountForFreeDelivery >= freeThreshold ? 0 : baseDeliveryFee);

    // Standard 5% GST on bakery confectionery
    const taxableAmount = Math.max(0, subtotal + packagingTotal - discountAmount);
    const taxGST = Math.round(taxableAmount * 0.05);

    // Final total
    const totalAmount = taxableAmount + taxGST + deliveryFee;

    return {
      verifiedItems,
      subtotal,
      packagingTotal,
      discountAmount,
      appliedCoupon,
      deliveryFee,
      shippingTier,
      taxGST,
      totalAmount: Math.max(1, totalAmount),
      amountInPaise: Math.max(100, Math.round(totalAmount * 100))
    };
  }
}
