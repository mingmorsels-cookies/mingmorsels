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
    try {
      user = JSON.parse(localStorage.getItem('user_profile') || '{}');
    } catch(e) {}
    const phone = (localStorage.getItem('ming_morsels_phone') || user.phone || '').replace(/\D/g, '');
    const address = localStorage.getItem('ming_morsels_address') || user.address || '';
    const pincode = localStorage.getItem('ming_morsels_pincode') || user.pincode || '';
    const name = user.name || localStorage.getItem('ming_morsels_name') || '';
    const email = user.email || localStorage.getItem('ming_morsels_email') || '';

    return { name, phone, email, address, pincode };
  }

  promptForShippingDetails(onComplete) {
    let modal = document.getElementById('shipping-details-modal');
    if (!modal) {
      modal = document.createElement('div');
      modal.id = 'shipping-details-modal';
      modal.style.cssText = 'position: fixed; top: 0; left: 0; width: 100vw; height: 100vh; background: rgba(0,0,0,0.7); backdrop-filter: blur(6px); display: flex; align-items: center; justify-content: center; z-index: 9999999; font-family: "Outfit", sans-serif;';
      modal.innerHTML = `
        <div class="modal-card" style="max-width: 460px; width: 90%; background: #FAF6F0; color: #3D2000; border-radius: 16px; padding: 24px; box-shadow: 0 20px 50px rgba(0,0,0,0.5); position: relative;">
          <button id="close-shipping-modal" style="position: absolute; top: 16px; right: 16px; background: none; border: none; font-size: 22px; cursor: pointer; color: #8C533E;">✕</button>
          <div style="display:flex; align-items:center; gap: 12px; margin-bottom: 12px;">
            <span style="font-size:28px;">📦</span>
            <div>
              <h3 style="font-family: 'Cormorant Garamond', serif; font-size: 24px; margin: 0; color: #3D2000; font-weight: 700;">How would you like to receive your order?</h3>
              <p style="font-size: 12.5px; color: #666; margin: 2px 0 0 0;">Choose between doorstep courier or self-pickup from store.</p>
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
              <label style="font-size: 11px; font-weight: 700; text-transform: uppercase; color: #8C533E; display:block; margin-bottom:4px;">Mobile Phone (10 Digits for Updates &amp; Pickup OTP) *</label>
              <input type="tel" id="ship-modal-phone" placeholder="e.g. 9876543210" maxlength="10" required style="width: 100%; padding: 10px 12px; border: 1px solid #D5C4B3; border-radius: 8px; font-size: 14px; background: #FFF; color: #3D2000; box-sizing: border-box;" />
            </div>
            <div>
              <label style="font-size: 11px; font-weight: 700; text-transform: uppercase; color: #8C533E; display:block; margin-bottom:4px;">Email Address (for Order Confirmation &amp; Invoice) *</label>
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

            <button type="submit" id="btn-submit-shipping-form" style="margin-top: 8px; padding: 13px; background: linear-gradient(135deg, #C6960C 0%, #A67C00 100%); color: #FFF; border: none; border-radius: 10px; font-weight: 700; font-size: 15px; cursor: pointer; box-shadow: 0 4px 14px rgba(198,150,12,0.3); display: flex; align-items: center; justify-content: center; gap: 8px;">
              <span>Proceed to Secure Payment →</span>
            </button>
          </form>
        </div>
      `;
      document.body.appendChild(modal);
    } else {
      modal.style.display = 'flex';
    }

    let activeDeliveryMode = 'courier';
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
        if (pin.startsWith('560')) {
          deliveryFee = subtotal >= 499 ? 0 : 49;
          isFree = subtotal >= 499;
        } else if (['561', '562', '563', '57', '58', '59'].some(p => pin.startsWith(p))) {
          deliveryFee = subtotal >= 599 ? 0 : 69;
          isFree = subtotal >= 599;
        } else if (['50', '51', '52', '53', '60', '61', '62', '63', '64', '67', '68', '69'].some(p => pin.startsWith(p))) {
          deliveryFee = subtotal >= 799 ? 0 : 89;
          isFree = subtotal >= 799;
        } else if (pin.length === 6) {
          deliveryFee = subtotal >= 899 ? 0 : 119;
          isFree = subtotal >= 899;
        } else {
          deliveryFee = subtotal >= 499 ? 0 : 49;
          isFree = subtotal >= 499;
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
          elDelivery.innerHTML = '<span style="color:#2E6B1A;">FREE (Threshold met)</span>';
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
        tabPickup.style.background = '#C6960C';
        tabPickup.style.color = '#FFF';
        tabPickup.style.fontWeight = '700';

        tabCourier.style.background = 'transparent';
        tabCourier.style.color = '#705840';
        tabCourier.style.fontWeight = '600';

        if (courierFields) courierFields.style.display = 'none';
        if (pickupInfo) pickupInfo.style.display = 'block';
      } else {
        tabCourier.style.background = '#C6960C';
        tabCourier.style.color = '#FFF';
        tabCourier.style.fontWeight = '700';

        tabPickup.style.background = 'transparent';
        tabPickup.style.color = '#705840';
        tabPickup.style.fontWeight = '600';

        if (courierFields) courierFields.style.display = 'flex';
        if (pickupInfo) pickupInfo.style.display = 'none';
      }
      updatePriceBreakdown();
    }

    tabCourier.onclick = () => setDeliveryMode('courier');
    tabPickup.onclick = () => setDeliveryMode('pickup');

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

      const payMethod = document.querySelector('input[name="checkout_pay_method"]:checked')?.value || 'PREPAID';

      localStorage.setItem('ming_morsels_name', name);
      localStorage.setItem('ming_morsels_phone', phone);
      localStorage.setItem('ming_morsels_email', email);
      localStorage.setItem('ming_morsels_address', activeDeliveryMode === 'pickup' ? address : `${address}, Pincode: ${pincode}`);
      localStorage.setItem('ming_morsels_pincode', pincode);
      localStorage.setItem('ming_morsels_delivery_mode', activeDeliveryMode);
      localStorage.setItem('ming_morsels_pay_method', payMethod);

      const userProfile = JSON.parse(localStorage.getItem('user_profile') || '{}');
      userProfile.name = name;
      userProfile.phone = phone;
      userProfile.email = email || userProfile.email || 'customer@mingmorsels.com';
      userProfile.address = activeDeliveryMode === 'pickup' ? address : `${address}, Pincode: ${pincode}`;
      userProfile.pincode = pincode;
      userProfile.delivery_mode = activeDeliveryMode;
      userProfile.payment_method = 'PREPAID';
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
    this.handleRazorpayCheckout(items);
  }

  async handleRazorpayCheckout(cartItems = []) {
    const items = cartItems.length > 0 ? cartItems : cartStore.getItems();
    if (items.length === 0) {
      alert("Your basket is empty. Add some delicious cookies first!");
      return;
    }

    const details = this.getCustomerDetails();

    // Check if details are missing
    if (!details.address || details.address.length < 5 || !details.phone) {
      const modal = document.getElementById('address-required-modal');
      if (modal) {
        document.getElementById('req-shipping-phone').value = details.phone || '';
        document.getElementById('req-shipping-address').value = details.address || '';
        modal.style.display = 'flex';
        modal.style.opacity = '1';
        modal.classList.add('active');
        const saveBtn = document.getElementById('btn-save-address-continue');
        saveBtn.onclick = () => {
          const newPhone = document.getElementById('req-shipping-phone').value.trim();
          const newAddr = document.getElementById('req-shipping-address').value.trim();
          const newPin = document.getElementById('req-shipping-pincode').value.trim();
          
          if (newPhone.length < 10 || newAddr.length < 5 || newPin.length !== 6) {
            alert('Please enter a valid phone number, address, and 6-digit pin code.');
            return;
          }
          
          const fullAddr = `${newAddr}, Bengaluru, ${newPin}`;
          localStorage.setItem('ming_morsels_phone', newPhone);
          localStorage.setItem('ming_morsels_address', fullAddr);
          localStorage.setItem('ming_morsels_pincode', newPin);
          
          // Also update user profile if exists
          try {
            const userProfile = JSON.parse(localStorage.getItem('user_profile') || '{}');
            userProfile.phone = newPhone;
            userProfile.address = fullAddr;
            userProfile.pincode = newPin;
            localStorage.setItem('user_profile', JSON.stringify(userProfile));
          } catch(e) {}
          modal.style.display = 'none';
          modal.style.opacity = '0';
          modal.classList.remove('active');
          this.handleRazorpayCheckout(cartItems); // Retry
        };
      } else {
        alert("Please update your delivery address in the dashboard before checking out.");
      }
      return;
    }

    saveActiveSession(SessionType.CHECKOUT_PAYMENT, { details, items });

    const payBtn = document.getElementById('btn-cart-razorpay');
    const origBtnText = payBtn ? payBtn.innerHTML : '';
    if (payBtn) {
      payBtn.disabled = true;
      payBtn.innerHTML = '<span>⏳ Preparing Razorpay Gateway...</span>';
    }

    try {
      const COOKIE_PRICES = {
        almond: 180, rose: 190, oatsnuts: 170, orange: 185,
        walnut: 210, walnut_sf: 220,
        strawberry: 140, pinacolada: 145, butterscotch: 150, chocochip: 155
      };

      const normalizedCart = items.map(item => {
        if (!item || typeof item !== 'object') return null;
        const key = String(item.id || item.key || '').trim();
        if (!key) return null;
        const qty = Math.max(1, parseInt(item.quantity ?? item.qty ?? 1, 10) || 1);
        const price = Number(item.price || item.customPrice || COOKIE_PRICES[key] || 180);
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

      const apiUrl = '/api/payment/create-order';
      const res = await fetch(apiUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          items: normalizedCart,
          total_amount: subtotal,
          coupon_code: window.activeAppliedCoupon || undefined,
          user_email: details.email || 'customer@mingmorsels.com',
          user_name: details.name || 'Guest Customer',
          user_phone: details.phone || '',
          shipping_address: document.querySelector('input[name="delivery_method"]:checked')?.value === 'pickup' ? 'Store Pickup: ' + details.address : details.address,
          payment_method: document.querySelector('input[name="payment_method"]:checked')?.value === 'cod' ? 'COD' : 'PREPAID'
        })
      });

      const text = await res.text();
      if (!text) {
        alert("⚠️ Empty response from server. Please ensure express server is running.");
        if (payBtn) { payBtn.disabled = false; payBtn.innerHTML = origBtnText; }
        return;
      }

      const orderData = JSON.parse(text);
      if (!orderData.success) {
        alert("Failed to create order: " + (orderData.error || 'Server error'));
        if (payBtn) { payBtn.disabled = false; payBtn.innerHTML = origBtnText; }
        return;
      }

      // Direct redirect for COD
      if (orderData.is_cod) {
        cartStore.clear();
        clearActiveSession();
        window.location.href = `/order-confirmation.html?order_id=${encodeURIComponent(orderData.order_id)}&payment_id=COD`;
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
          name: details.name || 'Valued Customer',
          email: details.email || 'customer@mingmorsels.com',
          contact: details.phone || ''
        },
        theme: {
          color: "#C8960C"
        },
        modal: {
          ondismiss: () => {
            console.log("[Razorpay] Checkout modal dismissed by user");
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

            // Redirect to new dedicated confirmation page
            window.location.href = `/order-confirmation.html?order_id=${encodeURIComponent(orderData.order_id)}&payment_id=${encodeURIComponent(response.razorpay_payment_id || 'Completed')}`;
          } catch (err) {
            console.error('[CheckoutController] Payment verification error:', err);
            window.location.href = `/order-confirmation.html?order_id=${encodeURIComponent(orderData.order_id)}&payment_id=${encodeURIComponent(response.razorpay_payment_id || 'Completed')}`;
          }
        }
      };

      if (orderData.razorpay_order_id) {
        options.order_id = String(orderData.razorpay_order_id).trim();
      }

      eventBus.emit(Events.CART_CLOSE);

      if (window.Razorpay) {
        const rzp = new window.Razorpay(options);
        rzp.on('payment.failed', function (resp) {
          alert('❌ Payment Failed: ' + (resp.error?.description || 'Transaction declined by bank.'));
          if (payBtn) { payBtn.disabled = false; payBtn.innerHTML = origBtnText; }
        });
        if (payBtn) { payBtn.disabled = false; payBtn.innerHTML = origBtnText; }
        rzp.open();
      } else {
        alert('⚠️ Razorpay checkout could not load. Please check your internet connection.');
        if (payBtn) { payBtn.disabled = false; payBtn.innerHTML = origBtnText; }
      }
    } catch (e) {
      console.error('[CheckoutController] Checkout error:', e);
      if (payBtn) { payBtn.disabled = false; payBtn.innerHTML = origBtnText; }
      alert('Failed to process payment: ' + (e.message || 'Server error'));
    }
  }

  showOrderConfirmedModal(orderId, awb) {
    const modal = document.getElementById('modal-order-confirmed');
    if (!modal) return;
    const orderEl = document.getElementById('conf-order-id');
    const awbEl = document.getElementById('conf-shipway-awb');
    const trackBtn = document.getElementById('btn-conf-track-shipway');
    const closeBtn = document.getElementById('btn-close-confirmed');
    const continueBtn = document.getElementById('btn-conf-continue-shopping');

    if (orderEl) orderEl.textContent = orderId || 'MM-928102';
    if (awbEl) awbEl.textContent = awb || 'SW-EXP-BENGALURU';
    if (trackBtn) {
      trackBtn.onclick = () => {
        window.location.href = `/track-order.html?order_id=${encodeURIComponent(orderId)}`;
      };
    }
    const closeModal = () => {
      modal.style.display = 'none';
      document.body.style.overflow = '';
    };
    if (closeBtn) closeBtn.onclick = closeModal;
    if (continueBtn) continueBtn.onclick = closeModal;

    modal.style.display = 'flex';
    document.body.style.overflow = 'hidden';
  }
}

export const checkoutController = new CheckoutController();
