// ─────────────────────────────────────────────────────────────────────────────
// EventBus.js - Decoupled Pub/Sub Event Messenger
// ─────────────────────────────────────────────────────────────────────────────

class EventBusEmitter {
  constructor() {
    this.events = new Map();
  }

  /**
   * Subscribe to an event
   * @param {string} event - Event name
   * @param {Function} callback - Event handler
   * @returns {Function} Unsubscribe function
   */
  on(event, callback) {
    if (!this.events.has(event)) {
      this.events.set(event, new Set());
    }
    this.events.get(event).add(callback);

    return () => this.off(event, callback);
  }

  /**
   * Unsubscribe from an event
   * @param {string} event - Event name
   * @param {Function} callback - Event handler to remove
   */
  off(event, callback) {
    if (this.events.has(event)) {
      this.events.get(event).delete(callback);
    }
  }

  /**
   * Subscribe to an event once
   * @param {string} event - Event name
   * @param {Function} callback - Event handler
   */
  once(event, callback) {
    const wrapper = (...args) => {
      this.off(event, wrapper);
      callback(...args);
    };
    this.on(event, wrapper);
  }

  /**
   * Emit an event with data
   * @param {string} event - Event name
   * @param {*} data - Payload passed to handlers
   */
  emit(event, data) {
    if (this.events.has(event)) {
      this.events.get(event).forEach(cb => {
        try {
          cb(data);
        } catch (err) {
          console.error(`[EventBus] Error in handler for event "${event}":`, err);
        }
      });
    }
  }
}

export const eventBus = new EventBusEmitter();

export const Events = {
  CART_UPDATED: 'cart:updated',
  CART_OPEN: 'cart:open',
  CART_CLOSE: 'cart:close',
  USER_LOGGED_IN: 'auth:login',
  USER_LOGGED_OUT: 'auth:logout',
  CHECKOUT_STARTED: 'checkout:start',
  CHECKOUT_SUCCESS: 'checkout:success',
  PRODUCT_HOVER: 'product:hover',
  PRODUCT_LEAVE: 'product:leave',
  FILTER_CHANGED: 'filter:changed',
  ORDER_LIVE_UPDATE: 'order:live_update'
};
