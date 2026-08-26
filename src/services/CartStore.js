// ─────────────────────────────────────────────────────────────────────────────
// Unified Artisanal Cart Store (Single Source of Truth)
// Supports multi-tab sync, custom packaging, coupons & Pub/Sub event bus
// ─────────────────────────────────────────────────────────────────────────────

const STORAGE_KEY = 'cart';
const COUPON_STORAGE_KEY = 'active_coupon';

class CartStore {
  constructor() {
    this.items = this.loadFromStorage();
    this.appliedCoupon = this.loadCouponFromStorage();
    this.listeners = new Set();

    // Listen for cross-tab or cross-window updates
    if (typeof window !== 'undefined') {
      window.addEventListener('storage', (e) => {
        if (e.key === STORAGE_KEY) {
          this.items = this.loadFromStorage();
          this.notify();
        } else if (e.key === COUPON_STORAGE_KEY) {
          this.appliedCoupon = this.loadCouponFromStorage();
          this.notify();
        }
      });
    }
  }

  loadFromStorage() {
    if (typeof window === 'undefined') return [];
    try {
      const data = localStorage.getItem(STORAGE_KEY);
      if (!data) return [];
      const parsed = JSON.parse(data);
      return Array.isArray(parsed) ? parsed : [];
    } catch (e) {
      console.warn('Failed to parse cart storage:', e);
      return [];
    }
  }

  saveToStorage() {
    if (typeof window === 'undefined') return;
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(this.items));
    } catch (e) {
      console.warn('Failed to save cart storage:', e);
    }
  }

  loadCouponFromStorage() {
    if (typeof window === 'undefined') return null;
    try {
      return localStorage.getItem(COUPON_STORAGE_KEY) || null;
    } catch (e) {
      return null;
    }
  }

  saveCouponToStorage() {
    if (typeof window === 'undefined') return;
    try {
      if (this.appliedCoupon) {
        localStorage.setItem(COUPON_STORAGE_KEY, this.appliedCoupon);
      } else {
        localStorage.removeItem(COUPON_STORAGE_KEY);
      }
    } catch (e) {}
  }

  subscribe(listener) {
    this.listeners.add(listener);
    // Trigger immediately with current state
    try {
      listener(this.items, this.appliedCoupon);
    } catch (e) {
      console.error('CartStore initial subscriber error:', e);
    }
    return () => this.listeners.delete(listener);
  }

  notify() {
    this.listeners.forEach((listener) => {
      try {
        listener(this.items, this.appliedCoupon);
      } catch (err) {
        console.error('CartStore listener error:', err);
      }
    });
  }

  getItems() {
    return [...this.items];
  }

  getTotalCount() {
    return this.items.reduce((total, item) => total + (Number(item.quantity) || 1), 0);
  }

  getItemCount() {
    return this.getTotalCount();
  }

  getSubtotal() {
    return this.items.reduce((total, item) => {
      const price = Number(item.price) || 180;
      const qty = Number(item.quantity) || 1;
      let lineTotal = price * qty;
      
      const boxPrice = Number(item.boxPrice) || 0;
      const boxCapacity = Number(item.boxCapacity) || 0;
      const itemCountPerUnit = Number(item.itemCountPerUnit) || 1;
      
      if (boxPrice > 0 && boxCapacity > 0) {
        const totalItems = qty * itemCountPerUnit;
        const boxesNeeded = Math.ceil(totalItems / boxCapacity);
        lineTotal += boxesNeeded * boxPrice;
      }
      
      return total + lineTotal;
    }, 0);
  }

  getTotalAmount() {
    return this.getSubtotal();
  }

  getAppliedCoupon() {
    return this.appliedCoupon;
  }

  setAppliedCoupon(code) {
    this.appliedCoupon = code ? String(code).trim().toUpperCase() : null;
    this.saveCouponToStorage();
    this.notify();
  }

  addItem(newItem) {
    if (!newItem || !newItem.id) return;
    
    const packaging = newItem.packaging || 'none';
    const existingIndex = this.items.findIndex(
      (item) => item.id === newItem.id && (item.packaging || 'none') === packaging
    );

    if (existingIndex > -1) {
      this.items[existingIndex].quantity = (Number(this.items[existingIndex].quantity) || 1) + (Number(newItem.quantity) || 1);
    } else {
      this.items.push({
        id: newItem.id,
        name: newItem.name || 'Artisanal Baked Selection',
        price: Number(newItem.price) > 0 ? Number(newItem.price) : 180,
        quantity: Number(newItem.quantity) || 1,
        image: newItem.image || '/logo.png',
        packaging: packaging,
        boxPrice: Number(newItem.boxPrice) || 0,
        boxCapacity: Number(newItem.boxCapacity) || 0,
        itemCountPerUnit: Number(newItem.itemCountPerUnit) || 1
      });
    }

    this.saveToStorage();
    this.notify();
  }

  updateQuantity(id, quantity, packaging = null) {
    const idx = this.items.findIndex(
      (item) => item.id === id && (packaging === null || (item.packaging || 'none') === packaging)
    );
    if (idx > -1) {
      const qty = parseInt(quantity, 10);
      if (isNaN(qty) || qty <= 0) {
        this.items.splice(idx, 1);
      } else {
        this.items[idx].quantity = qty;
      }
      this.saveToStorage();
      this.notify();
    }
  }

  incrementItem(id, packaging = null) {
    const idx = this.items.findIndex(
      (item) => item.id === id && (packaging === null || (item.packaging || 'none') === packaging)
    );
    if (idx > -1) {
      this.items[idx].quantity = (Number(this.items[idx].quantity) || 1) + 1;
      this.saveToStorage();
      this.notify();
    }
  }

  decrementItem(id, packaging = null) {
    const idx = this.items.findIndex(
      (item) => item.id === id && (packaging === null || (item.packaging || 'none') === packaging)
    );
    if (idx > -1) {
      const newQty = (Number(this.items[idx].quantity) || 1) - 1;
      if (newQty <= 0) {
        this.items.splice(idx, 1);
      } else {
        this.items[idx].quantity = newQty;
      }
      this.saveToStorage();
      this.notify();
    }
  }

  removeItem(id, packaging = null) {
    this.items = this.items.filter(
      (item) => !(item.id === id && (packaging === null || (item.packaging || 'none') === packaging))
    );
    this.saveToStorage();
    this.notify();
  }

  clear() {
    this.items = [];
    this.appliedCoupon = null;
    this.saveToStorage();
    this.saveCouponToStorage();
    this.notify();
  }
}

// Export singleton instance
export const cartStore = new CartStore();
