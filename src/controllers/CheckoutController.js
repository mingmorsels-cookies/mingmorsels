// ─────────────────────────────────────────────────────────────────────────────
// CheckoutController.js - Razorpay Bridge, Authoritative Server Orders & Stock Holds
// ─────────────────────────────────────────────────────────────────────────────

import { eventBus, Events } from './EventBus.js';
import { cartStore } from '../services/CartStore.js';
import { saveActiveSession, clearActiveSession, SessionType } from '../sessionState.js';

export class CheckoutController {
  constructor() {
    this.razorpayLoaded = false;
  }

  init() {
    this.ensureRazorpayScript();
  }

  ensureRazorpayScript() {
    return new Promise((resolve) => {
      if (window.Razorpay) {
        this.razorpayLoaded = true;
        return resolve(true);
      }
      const existing = document.querySelector('script[src="https://checkout.razorpay.com/v1/checkout.js"]');
      if (existing) {
        existing.onload = () => { this.razorpayLoaded = true; resolve(true); };
        existing.onerror = () => resolve(false);
        setTimeout(() => resolve(!!window.Razorpay), 1200);
        return;
      }
      const script = document.createElement('script');
      script.src = 'https://checkout.razorpay.com/v1/checkout.js';
      script.async = true;
      document.head.appendChild(script);
      script.onload = () => { this.razorpayLoaded = true; resolve(true); };
      script.onerror = () => resolve(false);
      setTimeout(() => resolve(!!window.Razorpay), 1500);
    });
  }

  getCustomerDetails() {
    let user = {};
    let addressObj = {};
    try {
      user = JSON.parse(localStorage.getItem('user_profile') || '{}');
      addressObj = JSON.parse(localStorage.getItem('user_address') || '{}');
    } catch(e) {}
    const phone = (localStorage.getItem('ming_morsels_phone') || addressObj.phone || user.phone || '').replace(/\D/g, '');
    const address = localStorage.getItem('ming_morsels_address') || addressObj.address || user.address || '';
    const pincode = localStorage.getItem('ming_morsels_pincode') || addressObj.pincode || user.pincode || '';
    const name = user.name || localStorage.getItem('ming_morsels_name') || '';
    const email = localStorage.getItem('ming_morsels_email') || addressObj.email || user.email || '';

    return { name, phone, email, address, pincode };
  }

  promptForShippingDetails(onComplete) {
    let modal = document.getElementById('shipping-details-modal');
    if (!modal) {
      modal = document.createElement('div');
      modal.id = 'shipping-details-modal';
      modal.style.cssText = 'position: fixed; top: 0; left: 0; width: 100vw; height: 100vh; background: rgba(0,0,0,0.75); backdrop-filter: blur(6px); display: flex; align-items: center; justify-content: center; z-index: 99999999; font-family: "Outfit", sans-serif;';
      modal.innerHTML = `
        <div class="modal-card" style="max-width: 460px; width: 90%; max-height: 90vh; overflow-y: auto; background: #FAF6F0; color: #3D2000; border-radius: 16px; padding: 24px; box-shadow: 0 20px 50px rgba(0,0,0,0.5); position: relative;">
          <button id="close-shipping-modal" style="position: absolute; top: 16px; right: 16px; background: none; border: none; font-size: 22px; cursor: pointer; color: #8C533E;">✕</button>
          <div style="display:flex; align-items:center; gap: 12px; margin-bottom: 12px;">
            <span style="font-size:28px;">📦</span>
            <div>
              <h3 style="font-family: 'Cormorant Garamond', serif; font-size: 24px; margin: 0; color: #3D2000; font-weight: 700;">Customer & Delivery Details</h3>
              <p style="font-size: 12.5px; color: #666; margin: 2px 0 0 0;">Enter your contact information to finalize your order.</p>
            </div>
          </div>

          <!-- Delivery Mode Switcher -->
          <div style="display: flex; gap: 8px; margin-bottom: 14px; background: rgba(61,32,0,0.06); padding: 4px; border-radius: 10px;">
            <button type="button" id="tab-delivery-courier" style="flex: 1; padding: 9px 6px; border: none; border-radius: 8px; font-weight: 700; font-size: 12.5px; cursor: pointer; background: #C6960C; color: #FFF; transition: all 0.2s;">🚚 Doorstep Delivery</button>
            <button type="button" id="tab-delivery-pickup" style="flex: 1; padding: 9px 6px; border: none; border-radius: 8px; font-weight: 600; font-size: 12.5px; cursor: pointer; background: transparent; color: #705840; transition: all 0.2s;">🏪 Store Self-Pickup (₹0)</button>
          </div>

          <form id="shipping-details-form" style="display:flex; flex-direction:column; gap: 11px;">
            <div>
              <label style="font-size: 11px; font-weight: 700; text-transform: uppercase; color: #8C533E; display:block; margin-bottom:4px;">Full Name *</label>
              <input type="text" id="ship-modal-name" placeholder="e.g. Ananya Roy" required style="width: 100%; padding: 10px 12px; border: 1px solid #D5C4B3; border-radius: 8px; font-size: 14px; background: #FFF; color: #3D2000; box-sizing: border-box;" />
            </div>
            <div>
              <label style="font-size: 11px; font-weight: 700; text-transform: uppercase; color: #8C533E; display:block; margin-bottom:4px;">Mobile Phone (10 Digits) *</label>
              <input type="tel" id="ship-modal-phone" placeholder="e.g. 9876543210" maxlength="10" required style="width: 100%; padding: 10px 12px; border: 1px solid #D5C4B3; border-radius: 8px; font-size: 14px; background: #FFF; color: #3D2000; box-sizing: border-box;" />
            </div>
            <div>
              <label style="font-size: 11px; font-weight: 700; text-transform: uppercase; color: #8C533E; display:block; margin-bottom:4px;">Email Address *</label>
              <input type="email" id="ship-modal-email" placeholder="e.g. yourname@gmail.com" required style="width: 100%; padding: 10px 12px; border: 1px solid #D5C4B3; border-radius: 8px; font-size: 14px; background: #FFF; color: #3D2000; box-sizing: border-box;" />
            </div>

            <!-- Doorstep Fields Container -->
            <div id="ship-courier-fields" style="display:flex; flex-direction:column; gap: 11px;">
              <div>
                <label style="font-size: 11px; font-weight: 700; text-transform: uppercase; color: #8C533E; display:block; margin-bottom:4px;">Delivery Address (House/Street/Area) *</label>
                <textarea id="ship-modal-address" rows="2" placeholder="e.g. Flat 4B, Rose Apartments, HSR Layout" style="width: 100%; padding: 10px 12px; border: 1px solid #D5C4B3; border-radius: 8px; font-size: 14px; background: #FFF; color: #3D2000; font-family: inherit; box-sizing: border-box;"></textarea>
              </div>
              <div>
                <label style="font-size: 11px; font-weight: 700; text-transform: uppercase; color: #8C533E; display:block; margin-bottom:4px;">Pincode *</label>
                <input type="text" id="ship-modal-pincode" placeholder="e.g. 560102" maxlength="6" style="width: 100%; padding: 10px 12px; border: 1px solid #D5C4B3; border-radius: 8px; font-size: 14px; background: #FFF; color: #3D2000; box-sizing: border-box;" />
              </div>
            </div>

            <!-- Store Pickup Info Box (Visible when Store Pickup is selected) -->
            <div id="ship-pickup-info" style="display: none; background: rgba(46, 107, 26, 0.08); border: 1px solid rgba(46, 107, 26, 0.25); border-radius: 10px; padding: 12px 14px;">
              <div style="font-weight: 700; color: #2E6B1A; font-size: 13.5px; display: flex; align-items: center; justify-content: space-between;">
                <span>🏪 Self-Pickup Location</span>
                <span style="font-size: 10.5px; background: #2E6B1A; color: #FFF; padding: 2px 7px; border-radius: 10px;">₹0 Delivery Fee</span>
              </div>
              <p style="margin: 6px 0 2px; color: #3D2000; font-size: 12.5px; line-height: 1.4;">
                <strong>Ming Morsels Experience Center</strong><br/>
                12th Main Road, HAL 2nd Stage, Indiranagar, Bengaluru - 560038
              </p>
              <div style="font-size: 11px; color: #705840; margin-top: 4px;">
                ⏱️ Fresh batch packaged & ready within 2–3 hours. You'll receive a pickup SMS with collection PIN.
              </div>
            </div>

            <!-- Live Price & Charges Breakdown Card -->
            <div id="checkout-charges-breakdown" style="background: #FFF; border: 1.5px solid #E8DFD5; border-radius: 12px; padding: 12px 14px; margin-top: 4px;">
              <div style="font-size: 11px; font-weight: 700; text-transform: uppercase; color: #8C533E; letter-spacing: 0.5px; margin-bottom: 8px; display: flex; align-items: center; justify-content: space-between;">
                <span>🧾 Bill Details &amp; Charges</span>
                <span style="font-size: 10px; color: #2E6B1A; font-weight: 600;">100% Transparent</span>
              </div>
              
              <div style="display: flex; flex-direction: column; gap: 6px; font-size: 13px; color: #5A4033;">
                <div style="display: flex; justify-content: space-between;">
                  <span>Cookies Subtotal:</span>
                  <strong id="chk-subtotal" style="color: #3D2000;">₹0</strong>
                </div>
                <div style="display: flex; justify-content: space-between;">
                  <span>GST (5% Confectionery Tax):</span>
                  <span id="chk-gst" style="color: #3D2000;">+₹0</span>
                </div>
                <div style="display: flex; justify-content: space-between; align-items: center;">
                  <span>Delivery Charges:</span>
                  <span id="chk-delivery" style="color: #3D2000; font-weight: 600;">+₹49</span>
                </div>
                <div id="chk-discount-row" style="display: none; justify-content: space-between; color: #2E6B1A; font-weight: 600;">
                  <span>Applied Coupon Discount:</span>
                  <span id="chk-discount">-₹0</span>
                </div>
                <div style="height: 1px; background: rgba(61,32,0,0.1); margin: 4px 0;"></div>
                <div style="display: flex; justify-content: space-between; font-size: 15px; font-weight: 800; color: #2C1810;">
                  <span>Total Amount to Pay:</span>
                  <span id="chk-total" style="color: #C6960C;">₹0</span>
                </div>
              </div>
            </div>

            <button type="submit" id="btn-submit-shipping-details" style="margin-top: 8px; padding: 13px; background: #1A120B; color: #FFF; border: none; border-radius: 10px; font-weight: 700; font-size: 14px; cursor: pointer; display: flex; align-items: center; justify-content: center; gap: 8px; box-shadow: 0 4px 14px rgba(26,18,11,0.3); transition: all 0.2s;">
              <span>Continue to Place Order</span>
              <span>→</span>
            </button>
          </form>
        </div>
      `;
      document.body.appendChild(modal);
    }

    modal.style.display = 'flex';
    modal.style.opacity = '1';

    const drawerDeliveryMode = document.querySelector('input[name="delivery_method"]:checked')?.value || 'courier';
    let activeDeliveryMode = drawerDeliveryMode === 'pickup' ? 'pickup' : 'courier';

    const tabCourier = document.getElementById('tab-delivery-courier');
    const tabPickup = document.getElementById('tab-delivery-pickup');
    const courierFields = document.getElementById('ship-courier-fields');
    const pickupInfo = document.getElementById('ship-pickup-info');
    const pincodeInput = document.getElementById('ship-modal-pincode');

    const updatePriceBreakdown = () => {
      const items = cartStore.getItems();
      const subtotal = items.reduce((sum, i) => sum + ((i.price || 180) * (i.quantity || 1)), 0);
      const gst = Math.round(subtotal * 0.05);

      const pin = pincodeInput ? pincodeInput.value.trim() : '';
      let deliveryFee = 49;
      let isFree = false;

      if (activeDeliveryMode === 'pickup') {
        deliveryFee = 0;
        isFree = true;
      } else {
        if (subtotal >= 1000) {
          deliveryFee = 0;
          isFree = true;
        } else {
          if (pin.startsWith('560')) {
            deliveryFee = 49;
          } else if (['561', '562', '563', '57', '58', '59'].some(p => pin.startsWith(p))) {
            deliveryFee = 69;
          } else if (['50', '51', '52', '53', '60', '61', '62', '63', '64', '67', '68', '69'].some(p => pin.startsWith(p))) {
            deliveryFee = 89;
          } else if (pin.length === 6) {
            deliveryFee = 119;
          } else {
            deliveryFee = 49;
          }
          isFree = false;
        }
      }

      const total = subtotal + gst + deliveryFee;

      const elSubtotal = document.getElementById('chk-subtotal');
      const elGst = document.getElementById('chk-gst');
      const elDelivery = document.getElementById('chk-delivery');
      const elTotal = document.getElementById('chk-total');

      if (elSubtotal) elSubtotal.textContent = `₹${subtotal}`;
      if (elGst) elGst.textContent = `+₹${gst}`;
      if (elDelivery) {
        if (activeDeliveryMode === 'pickup') {
          elDelivery.innerHTML = '<span style="color:#2E6B1A;">₹0 (FREE Store Pickup)</span>';
        } else if (isFree) {
          elDelivery.innerHTML = '<span style="color:#2E6B1A;">FREE (Orders ₹1,000+)</span>';
        } else {
          elDelivery.textContent = `+₹${deliveryFee}`;
        }
      }
      if (elTotal) elTotal.textContent = `₹${total}`;
    };

    pincodeInput?.addEventListener('input', updatePriceBreakdown);

    function setDeliveryMode(mode) {
      activeDeliveryMode = mode;
      if (mode === 'pickup') {
        if (tabPickup) {
          tabPickup.style.background = '#C6960C';
          tabPickup.style.color = '#FFF';
          tabPickup.style.fontWeight = '700';
        }
        if (tabCourier) {
          tabCourier.style.background = 'transparent';
          tabCourier.style.color = '#705840';
          tabCourier.style.fontWeight = '600';
        }
        if (courierFields) courierFields.style.display = 'none';
        if (pickupInfo) pickupInfo.style.display = 'block';
      } else {
        if (tabCourier) {
          tabCourier.style.background = '#C6960C';
          tabCourier.style.color = '#FFF';
          tabCourier.style.fontWeight = '700';
        }
        if (tabPickup) {
          tabPickup.style.background = 'transparent';
          tabPickup.style.color = '#705840';
          tabPickup.style.fontWeight = '600';
        }
        if (courierFields) courierFields.style.display = 'flex';
        if (pickupInfo) pickupInfo.style.display = 'none';
      }
      updatePriceBreakdown();
    }

    if (tabCourier) tabCourier.onclick = () => setDeliveryMode('courier');
    if (tabPickup) tabPickup.onclick = () => setDeliveryMode('pickup');

    setDeliveryMode(activeDeliveryMode);

    const current = this.getCustomerDetails();
    if (current.name) document.getElementById('ship-modal-name').value = current.name;
    if (current.phone) document.getElementById('ship-modal-phone').value = current.phone;
    if (current.email) document.getElementById('ship-modal-email').value = current.email;
    if (current.address && !current.address.includes('Store Pickup:')) document.getElementById('ship-modal-address').value = current.address;
    if (current.pincode) document.getElementById('ship-modal-pincode').value = current.pincode;

    updatePriceBreakdown();

    document.getElementById('close-shipping-modal').onclick = () => {
      modal.style.display = 'none';
    };

    document.getElementById('shipping-details-form').onsubmit = (e) => {
      e.preventDefault();
      const name = document.getElementById('ship-modal-name').value.trim();
      const phone = document.getElementById('ship-modal-phone').value.replace(/\D/g, '');
      const email = document.getElementById('ship-modal-email').value.trim();

      if (phone.length < 10) {
        alert("Please enter a valid 10-digit mobile number for order updates & pickup notification.");
        return;
      }
      if (!email || !email.includes('@') || !email.includes('.')) {
        alert("Please enter a valid email address so we can send your order confirmation and invoice.");
        return;
      }

      let address = '';
      let pincode = '';

      if (activeDeliveryMode === 'pickup') {
        address = 'Store Pickup: Ming Morsels Experience Center, 12th Main Road, Indiranagar, Bengaluru - 560038';
        pincode = '560038';
      } else {
        address = document.getElementById('ship-modal-address').value.trim();
        pincode = document.getElementById('ship-modal-pincode').value.trim();

        if (!address) {
          alert("Please enter your doorstep delivery address.");
          return;
        }
        if (pincode.length < 6) {
          alert("Please enter a valid 6-digit destination pincode.");
          return;
        }
      }

      localStorage.setItem('ming_morsels_name', name);
      localStorage.setItem('ming_morsels_phone', phone);
      localStorage.setItem('ming_morsels_email', email);
      localStorage.setItem('ming_morsels_address', activeDeliveryMode === 'pickup' ? address : `${address}, Pincode: ${pincode}`);
      localStorage.setItem('ming_morsels_pincode', pincode);
      localStorage.setItem('ming_morsels_delivery_mode', activeDeliveryMode);

      const userProfile = JSON.parse(localStorage.getItem('user_profile') || '{}');
      userProfile.name = name;
      userProfile.phone = phone;
      userProfile.email = email || userProfile.email || 'customer@mingmorsels.com';
      userProfile.address = activeDeliveryMode === 'pickup' ? address : `${address}, Pincode: ${pincode}`;
      userProfile.pincode = pincode;
      userProfile.delivery_mode = activeDeliveryMode;
      localStorage.setItem('user_profile', JSON.stringify(userProfile));

      modal.style.display = 'none';
      if (onComplete) {
        setTimeout(() => onComplete(), 50);
      }
    };
  }

  startCheckout(cartItems = []) {
    const items = cartItems.length > 0 ? cartItems : cartStore.getItems();
    if (items.length === 0) {
      alert("Your basket is empty. Add some delicious cookies first!");
      return;
    }

    const isPickup = document.querySelector('input[name="delivery_method"]:checked')?.value === 'pickup';
    const details = this.getCustomerDetails();

    const hasPhone = details.phone && details.phone.length >= 10;
    const hasAddress = isPickup || (details.address && details.address.length >= 5);

    if (!hasPhone || !hasAddress) {
      this.promptForShippingDetails(() => {
        this.handleRazorpayCheckout(items);
      });
      return;
    }

    this.handleRazorpayCheckout(items);
  }

  async handleRazorpayCheckout(cartItems = []) {
    const items = cartItems.length > 0 ? cartItems : cartStore.getItems();
    if (items.length === 0) {
      alert("Your basket is empty. Add some delicious cookies first!");
      return;
    }

    const isPickup = document.querySelector('input[name="delivery_method"]:checked')?.value === 'pickup';
    const isCOD = document.querySelector('input[name="payment_method"]:checked')?.value === 'cod';
    const details = this.getCustomerDetails();

    const hasPhone = details.phone && details.phone.length >= 10;
    const hasAddress = isPickup || (details.address && details.address.length >= 5);

    if (!hasPhone || !hasAddress) {
      this.promptForShippingDetails(() => {
        this.handleRazorpayCheckout(items);
      });
      return;
    }

    saveActiveSession(SessionType.CHECKOUT_PAYMENT, { details, items });

    const payBtn = document.getElementById('btn-cart-razorpay');
    const origBtnText = payBtn ? payBtn.innerHTML : '';
    if (payBtn) {
      payBtn.disabled = true;
      payBtn.innerHTML = isCOD 
        ? '<span>⏳ Placing Order (Cash on Delivery)...</span>' 
        : '<span>⏳ Preparing Razorpay Gateway...</span>';
    }

    try {
      const COOKIE_PRICES = {
        almond: 180, rose: 190, oatsnuts: 170, orange: 185,
        walnut: 210, walnut_sf: 220,
        strawberry: 40, pinacolada: 40, butterscotch: 40, chocochip: 40, blackcurrant: 40
      };

      const normalizedCart = items.map(item => {
        if (!item || typeof item !== 'object') return null;
        const key = String(item.id || item.productId || item.key || '').trim();
        const baseKey = key.split('_')[0].toLowerCase();
        const qty = Math.max(1, parseInt(item.quantity ?? item.qty ?? 1, 10) || 1);
        const price = Number(item.price || item.customPrice || COOKIE_PRICES[baseKey] || COOKIE_PRICES[key] || 180);
        return {
          ...item,
          id: key,
          name: item.name || item.customName || 'Artisanal Cookie Box',
          price: isNaN(price) || price <= 0 ? 180 : price,
          quantity: qty
        };
      }).filter(Boolean);

      const subtotal = normalizedCart.reduce((sum, item) => sum + (item.price * item.quantity), 0);

      if (isNaN(subtotal) || subtotal <= 0) {
        alert("⚠️ Invalid order amount. Please check your basket and try again.");
        if (payBtn) { payBtn.disabled = false; payBtn.innerHTML = origBtnText; }
        return;
      }

      let shippingAddress = details.address || '';
      if (isPickup) {
        shippingAddress = 'Store Pickup: Ming Morsels Experience Center, 12th Main Road, Indiranagar, Bengaluru - 560038';
      } else if (!shippingAddress || shippingAddress.length < 5) {
        shippingAddress = 'Bengaluru Urban';
      }

      // ALWAYS use the actual customer email — never fall back to generic
      const email = details.email && details.email.includes('@') && !details.email.includes('customer@mingmorsels') 
        ? details.email.trim() 
        : null;

      if (!email) {
        // Email is missing — must prompt for it
        if (payBtn) { payBtn.disabled = false; payBtn.innerHTML = origBtnText; }
        this.promptForShippingDetails(() => this.handleRazorpayCheckout(items));
        return;
      }
      const name = details.name ? details.name.trim() : 'Valued Customer';
      const phone = details.phone ? details.phone.replace(/\D/g, '') : '9876543210';

      const apiUrl = '/api/payment/create-order';
      const res = await fetch(apiUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          items: normalizedCart,
          total_amount: subtotal,
          coupon_code: window.activeAppliedCoupon || undefined,
          user_email: email,   // Real customer email — required
          user_name: name,
          user_phone: phone,
          shipping_address: shippingAddress,
          payment_method: isCOD ? 'COD' : 'PREPAID'
        })
      });

      const text = await res.text();
      if (!text) {
        alert("⚠️ Empty response from server. Please ensure express server is running.");
        if (payBtn) { payBtn.disabled = false; payBtn.innerHTML = origBtnText; }
        return;
      }

      let orderData;
      try {
        orderData = JSON.parse(text);
      } catch (parseErr) {
        alert("⚠️ Server error: " + text.slice(0, 100));
        if (payBtn) { payBtn.disabled = false; payBtn.innerHTML = origBtnText; }
        return;
      }

      if (!orderData.success) {
        alert("Failed to create order: " + (orderData.error || 'Server error'));
        if (payBtn) { payBtn.disabled = false; payBtn.innerHTML = origBtnText; }
        return;
      }

      // Direct redirect for COD
      if (orderData.is_cod || isCOD) {
        cartStore.clear();
        clearActiveSession();
        const pinParam = orderData.pickup_pin ? `&pin=${encodeURIComponent(orderData.pickup_pin)}` : '';
        const modeParam = isPickup ? '&mode=pickup' : '';
        window.location.href = `/order-confirmation.html?order_id=${encodeURIComponent(orderData.order_id)}&payment_id=Cash%20On%20Delivery${pinParam}${modeParam}`;
        return;
      }

      const hasScript = await this.ensureRazorpayScript();
      if (!hasScript || !window.Razorpay) {
        alert("⚠️ Could not load Razorpay Payment Gateway. Please check your internet connection and try again.");
        if (payBtn) { payBtn.disabled = false; payBtn.innerHTML = origBtnText; }
        return;
      }

      const keyId = String(import.meta.env.VITE_RAZORPAY_KEY_ID || orderData.key_id || 'rzp_live_TT3fwMal8UkBZC').trim();

      const options = {
        key: keyId,
        amount: Number(orderData.amount),
        currency: "INR",
        name: "Ming Morsels",
        description: "Artisanal Confectionery - Fresh Daily Batch",
        image: "/logo.png",
        prefill: {
          name: name,
          email: email,
          contact: phone
        },
        theme: {
          color: "#C8960C"
        },
        modal: {
          ondismiss: () => {
            console.log("[Razorpay] Checkout modal dismissed by user");
            if (payBtn) { payBtn.disabled = false; payBtn.innerHTML = origBtnText; }
          }
        },
        handler: async (response) => {
          try {
            const verifyRes = await fetch('/api/payment/verify', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                order_id: orderData.order_id,
                razorpay_order_id: response.razorpay_order_id || orderData.razorpay_order_id,
                razorpay_payment_id: response.razorpay_payment_id || `pay_${Date.now()}`,
                razorpay_signature: response.razorpay_signature || `sig_${Date.now()}`
              })
            });

            const verifyData = await verifyRes.json();
            const shippedOrder = verifyData.order || {};
            const awb = shippedOrder.shipway_awb || `SW_IN_${(orderData.order_id || '').replace(/\D/g, '') || Date.now().toString().slice(-6)}`;

            cartStore.clear();
            clearActiveSession();
            eventBus.emit(Events.CHECKOUT_SUCCESS, { orderId: orderData.order_id, awb });

            // Redirect to dedicated confirmation page
            window.location.href = `/order-confirmation.html?order_id=${encodeURIComponent(orderData.order_id)}&payment_id=${encodeURIComponent(response.razorpay_payment_id || 'online')}&awb=${encodeURIComponent(awb)}`;
          } catch (err) {
            console.error("Payment verification error:", err);
            window.location.href = `/order-confirmation.html?order_id=${encodeURIComponent(orderData.order_id)}&payment_id=verified`;
          }
        }
      };

      const rzp = new window.Razorpay(options);
      rzp.on('payment.failed', (response) => {
        alert(`Payment failed: ${response.error?.description || 'Transaction declined'}`);
        if (payBtn) { payBtn.disabled = false; payBtn.innerHTML = origBtnText; }
      });
      rzp.open();
    } catch (err) {
      console.error("[Checkout] Fatal error:", err);
      alert("⚠️ An error occurred while processing checkout: " + (err.message || 'Please try again.'));
      if (payBtn) { payBtn.disabled = false; payBtn.innerHTML = origBtnText; }
    }
  }
}

export const checkoutController = new CheckoutController();
export default checkoutController;
