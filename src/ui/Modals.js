// ─────────────────────────────────────────────────────────────────────────────
// Modal Dialogs & Customer Information Prompts Controller (Accessible & Focus-Trapped)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Traps focus within an active modal dialog for a11y compliance
 */
export function trapFocus(modalElement) {
  const focusableElements = modalElement.querySelectorAll(
    'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
  );
  if (!focusableElements.length) return () => {};

  const firstElement = focusableElements[0];
  const lastElement = focusableElements[focusableElements.length - 1];

  const handleKeyDown = (e) => {
    if (e.key === 'Tab') {
      if (e.shiftKey) {
        if (document.activeElement === firstElement) {
          e.preventDefault();
          lastElement.focus();
        }
      } else {
        if (document.activeElement === lastElement) {
          e.preventDefault();
          firstElement.focus();
        }
      }
    } else if (e.key === 'Escape') {
      modalElement.classList.remove('active');
      document.body.style.overflow = '';
      if (modalElement.id === 'shipping-prompt-modal') {
        modalElement.remove();
      }
    }
  };

  modalElement.addEventListener('keydown', handleKeyDown);
  firstElement.focus();

  return () => modalElement.removeEventListener('keydown', handleKeyDown);
}

export function initModalListeners() {
  // Global Escape key handler for all active modals
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      document.querySelectorAll('.policy-modal.active, .location-modal.active, .product-modal.active').forEach(m => {
        m.classList.remove('active');
      });
      document.body.style.overflow = '';
    }
  });

  // Policy Modals Open & Close
  document.querySelectorAll('[data-open-modal]').forEach(trigger => {
    trigger.addEventListener('click', (e) => {
      e.preventDefault();
      const modalId = trigger.getAttribute('data-open-modal');
      const modal = document.getElementById(modalId);
      if (modal) {
        modal.classList.add('active');
        modal.setAttribute('role', 'dialog');
        modal.setAttribute('aria-modal', 'true');
        document.body.style.overflow = 'hidden';
        trapFocus(modal);
      }
    });
  });

  document.querySelectorAll('.btn-modal-close, [data-close-modal]').forEach(btn => {
    btn.addEventListener('click', () => {
      const modal = btn.closest('.policy-modal, .location-modal, .product-modal');
      if (modal) {
        modal.classList.remove('active');
        document.body.style.overflow = '';
      }
    });
  });

  // Location Modal Binding
  const btnOpenLocation = document.getElementById('btn-open-location');
  const locationModal = document.getElementById('location-modal');
  const btnCloseLocation = document.getElementById('btn-location-close');

  if (btnOpenLocation && locationModal) {
    btnOpenLocation.addEventListener('click', () => {
      locationModal.classList.add('active');
      locationModal.setAttribute('role', 'dialog');
      locationModal.setAttribute('aria-modal', 'true');
      document.body.style.overflow = 'hidden';
      trapFocus(locationModal);
    });
  }

  if (btnCloseLocation && locationModal) {
    btnCloseLocation.addEventListener('click', () => {
      locationModal.classList.remove('active');
      document.body.style.overflow = '';
    });
  }
}

export function promptForCustomerAddress(onComplete) {
  const existingModal = document.getElementById('shipping-prompt-modal');
  if (existingModal) existingModal.remove();

  const user = JSON.parse(localStorage.getItem('user_profile') || '{}');
  const savedName = user.name || localStorage.getItem('ming_morsels_name') || '';
  const savedEmail = user.email || localStorage.getItem('ming_morsels_email') || '';
  const savedPhone = localStorage.getItem('ming_morsels_phone') || user.phone || '';
  const savedAddress = localStorage.getItem('ming_morsels_address') || user.address || '';
  const savedPincode = localStorage.getItem('ming_morsels_pincode') || user.pincode || '';

  const modal = document.createElement('div');
  modal.id = 'shipping-prompt-modal';
  modal.className = 'policy-modal active';
  modal.setAttribute('role', 'dialog');
  modal.setAttribute('aria-modal', 'true');
  modal.innerHTML = `
    <div class="policy-modal-card" style="max-width: 500px; text-align: left; max-height: 90vh; overflow-y: auto;">
      <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px;">
        <h3 style="margin: 0; color: #3D2000; font-family: var(--font-serif); font-size: 22px;">Delivery Address</h3>
        <button id="btn-close-shipping-prompt" aria-label="Close address modal" style="background: none; border: none; font-size: 24px; cursor: pointer; color: #705840; padding: 4px 8px;">&times;</button>
      </div>
      <p style="font-size: 13px; color: #705840; margin-bottom: 16px;">Please provide your delivery details for white-glove dispatched fulfillment.</p>
      
      <div style="display: flex; flex-direction: column; gap: 12px;">
        <div>
          <label for="ship-name" style="font-size: 11px; font-weight: 700; color: #705840; text-transform: uppercase;">Full Name</label>
          <input type="text" id="ship-name" value="${savedName}" placeholder="Your Full Name" style="width: 100%; padding: 10px; border: 1px solid #E0D4C5; border-radius: 8px; font-size: 13px; box-sizing: border-box;" />
        </div>
        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 10px;">
          <div>
            <label for="ship-email" style="font-size: 11px; font-weight: 700; color: #705840; text-transform: uppercase;">Email Address (For Invoice & Updates)</label>
            <input type="email" id="ship-email" value="${savedEmail}" placeholder="you@example.com" style="width: 100%; padding: 10px; border: 1px solid #E0D4C5; border-radius: 8px; font-size: 13px; box-sizing: border-box;" />
          </div>
          <div>
            <label for="ship-phone" style="font-size: 11px; font-weight: 700; color: #705840; text-transform: uppercase;">Phone Number (For Delivery SMS)</label>
            <input type="tel" id="ship-phone" value="${savedPhone}" placeholder="10-digit mobile number" maxlength="10" style="width: 100%; padding: 10px; border: 1px solid #E0D4C5; border-radius: 8px; font-size: 13px; box-sizing: border-box;" />
          </div>
        </div>
        <div>
          <label for="ship-address" style="font-size: 11px; font-weight: 700; color: #705840; text-transform: uppercase;">Street Address / Apartment</label>
          <textarea id="ship-address" rows="2" placeholder="House/Flat No, Apartment, Street name" style="width: 100%; padding: 10px; border: 1px solid #E0D4C5; border-radius: 8px; font-size: 13px; box-sizing: border-box;">${savedAddress}</textarea>
        </div>
        <div>
          <label for="ship-pincode" style="font-size: 11px; font-weight: 700; color: #705840; text-transform: uppercase;">PIN Code (Bengaluru / India)</label>
          <input type="text" id="ship-pincode" value="${savedPincode}" placeholder="e.g. 560038" maxlength="6" style="width: 100%; padding: 10px; border: 1px solid #E0D4C5; border-radius: 8px; font-size: 13px; box-sizing: border-box;" />
        </div>
        <div>
          <label for="ship-gift-msg" style="font-size: 11px; font-weight: 700; color: #705840; text-transform: uppercase;">Personalized Gift Card Note (Optional)</label>
          <input type="text" id="ship-gift-msg" placeholder="e.g. Happy Birthday! Wishing you warmth & sweet moments." maxlength="300" style="width: 100%; padding: 10px; border: 1px solid #E0D4C5; border-radius: 8px; font-size: 12px; box-sizing: border-box;" />
        </div>
      </div>

      <button id="btn-save-shipping-prompt" style="width: 100%; margin-top: 20px; padding: 14px; background: #C8960C; color: #120E0B; border: none; border-radius: 8px; font-weight: 700; font-size: 14px; cursor: pointer; text-transform: uppercase; letter-spacing: 1px;">Save & Proceed to Checkout</button>
    </div>
  `;

  document.body.appendChild(modal);
  trapFocus(modal);

  document.getElementById('btn-close-shipping-prompt')?.addEventListener('click', () => modal.remove());

  document.getElementById('btn-save-shipping-prompt')?.addEventListener('click', () => {
    const name = document.getElementById('ship-name').value.trim();
    const email = document.getElementById('ship-email').value.trim();
    const phone = document.getElementById('ship-phone').value.trim().replace(/\D/g, '');
    const address = document.getElementById('ship-address').value.trim();
    const pincode = document.getElementById('ship-pincode').value.trim();
    const giftMessage = document.getElementById('ship-gift-msg')?.value.trim() || '';

    if (!name || !email || phone.length < 10 || address.length < 5 || pincode.length < 6) {
      alert('Please fill in all required shipping fields with a valid 10-digit phone and 6-digit PIN code.');
      return;
    }

    localStorage.setItem('ming_morsels_name', name);
    localStorage.setItem('ming_morsels_email', email);
    localStorage.setItem('ming_morsels_phone', phone);
    localStorage.setItem('ming_morsels_address', address);
    localStorage.setItem('ming_morsels_pincode', pincode);

    // Auto-capture abandoned cart lead in the background
    try {
      const cart = JSON.parse(localStorage.getItem('cart') || '[]');
      if (cart.length > 0) {
        fetch('/api/cart/abandoned', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            email,
            name,
            phone,
            items: cart,
            total_amount: cart.reduce((sum, it) => sum + (it.price * (it.quantity || 1)), 0)
          })
        }).catch(() => {});
      }
    } catch (e) {}

    modal.remove();
    if (typeof onComplete === 'function') {
      onComplete({ name, email, phone, address, pincode, giftMessage });
    }
  });
}
