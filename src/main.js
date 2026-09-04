// ─────────────────────────────────────────────────────────────────────────────
// mingmorsels - High-Performance Modular Application Entrypoint
// ─────────────────────────────────────────────────────────────────────────────

import './style.css';
import './FlowingMenu.css';
import './TextType.css';

import { eventBus, Events } from './controllers/EventBus.js';
import { authController } from './controllers/AuthController.js';
import { checkoutController } from './controllers/CheckoutController.js';
import { liveFeedController } from './controllers/LiveFeedController.js';
import { uiController, COOKIE_DATA } from './controllers/UIController.js';
import { cartStore } from './services/CartStore.js';
import { initGiftBoxBuilder, showBoxBuilder } from './GiftBoxBuilder.js';
import { initPairingQuiz, showPairingQuiz } from './PairingQuiz.js';
import { initSocialGallery } from './SocialGallery.js';
import { initDriftWall } from './DriftWall.js';
import { initFlipText } from './FlipText.js';
import { initNetworkMonitor, saveActiveSession, getSavedSession, showRecoveryBanner, SessionType } from './sessionState.js';

import { openQuickAddModal, PRODUCT_BOX_CATALOG } from './controllers/QuickAddModal.js';

if (typeof window !== 'undefined' && typeof document !== 'undefined') {
  Object.values(PRODUCT_BOX_CATALOG).forEach(product => {
    product.boxes?.forEach(box => {
      if (box.img) {
        const link = document.createElement('link');
        link.rel = 'preload';
        link.as = 'image';
        link.href = box.img;
        document.head.appendChild(link);
      }
    });
  });
}
import { init3DEnvironment } from './controllers/ThreeController.js';

// Prevent browser scroll restoration miscalculations & start at Hero
if (typeof history !== 'undefined' && 'scrollRestoration' in history) {
  history.scrollRestoration = 'manual';
}
if (typeof window !== 'undefined') {
  if (window.location.hash) {
    try {
      history.replaceState(null, null, window.location.pathname + window.location.search);
    } catch (e) {}
  }
  window.scrollTo(0, 0);
}

let threeControllerInstance = null;

async function startApp() {
  window.scrollTo(0, 0);

  // 1. Initialize UI Controller & Preloader first
  uiController.init();

  // 2. Initialize Three.js WebGL engine immediately on Desktop & Tablet (> 768px)
  if (window.innerWidth > 768) {
    try {
      threeControllerInstance = init3DEnvironment();
      uiController.setThreeController(threeControllerInstance);
    } catch (err) {
      console.warn("[Three.js] Initialization error:", err);
      document.body.classList.add('no-webgl');
    }
  }

  // 3. Initialize Domain Controllers
  authController.init();
  checkoutController.init();
  liveFeedController.init();

  // 4. Initialize Interactive Luxury Features
  try {
    initGiftBoxBuilder((boxItem) => {
      cartStore.addItem(boxItem);
      uiController.openCartDrawer();
    });
    initPairingQuiz((pairItem) => {
      openQuickAddModal(pairItem.id);
    });
    initSocialGallery();
    const driftWallRoot = document.getElementById('drift-wall-root');
    if (driftWallRoot) initDriftWall(driftWallRoot);

    const flipTextRoot = document.getElementById('flip-text-root');
    if (flipTextRoot) {
      initFlipText(flipTextRoot, {
        text: 'Unit of Miora Delights Private Limited',
        duration: 2.2,
        delay: 0,
        loop: true,
        separator: ' ',
        together: false
      });
    }

    // Stats Counter Animation
    const statsSection = document.getElementById('story-in-numbers');
    if (statsSection) {
      const numbers = statsSection.querySelectorAll('.stats-number[data-target]');
      let animated = false;
      const observer = new IntersectionObserver((entries) => {
        if (entries[0].isIntersecting && !animated) {
          animated = true;
          numbers.forEach(el => {
            const target = parseInt(el.dataset.target, 10);
            const suffix = el.dataset.suffix || '';
            const duration = 1600;
            const startTime = performance.now();
            const update = (now) => {
              const elapsed = now - startTime;
              const progress = Math.min(elapsed / duration, 1);
              const ease = progress === 1 ? 1 : 1 - Math.pow(2, -10 * progress);
              const current = Math.floor(ease * target);
              el.textContent = `${(current >= 1000 ? current.toLocaleString() : current)}${suffix}`;
              if (progress < 1) requestAnimationFrame(update);
              else el.textContent = `${(target >= 1000 ? target.toLocaleString() : target)}${suffix}`;
            };
            requestAnimationFrame(update);
          });
          observer.disconnect();
        }
      }, { threshold: 0.2 });
      observer.observe(statsSection);
    }

    document.getElementById('btn-open-gift-builder')?.addEventListener('click', () => {
      saveActiveSession(SessionType.GIFT_BOX_BUILDER);
      showBoxBuilder();
    });
    document.getElementById('btn-mobile-gift-builder')?.addEventListener('click', () => {
      saveActiveSession(SessionType.GIFT_BOX_BUILDER);
      showBoxBuilder();
    });
    document.getElementById('btn-open-flavor-quiz')?.addEventListener('click', showPairingQuiz);
    document.getElementById('btn-mobile-flavor-quiz')?.addEventListener('click', showPairingQuiz);
  } catch (e) {
    console.error("[Features] Luxury initializers:", e);
  }

  // 5. Bind Add to Cart Buttons to 3-Box Selection Modal
  const handleAddToCartClick = (btn, e) => {
    e?.preventDefault();
    e?.stopPropagation();
    const target = btn.getAttribute('data-cookie') ||
                   btn.getAttribute('data-target') || 
                   btn.closest('.product-card')?.getAttribute('data-target') ||
                   btn.closest('.product-card')?.getAttribute('data-cookie') ||
                   'almond';
    openQuickAddModal(target);
  };

  document.querySelectorAll('.btn-add-to-cart, .btn-card-add, [data-action="add-to-cart"]').forEach(btn => {
    btn.addEventListener('click', (e) => handleAddToCartClick(btn, e));
  });

  document.addEventListener('click', (e) => {
    const btn = e.target.closest('.btn-add-to-cart, .btn-card-add, [data-action="add-to-cart"]');
    if (btn) {
      handleAddToCartClick(btn, e);
    }
  });

  // 6. Expose QuickAddModal and listen to Chatbot Iframe events
  window.quickAddModal = { open: openQuickAddModal };
  window.openQuickAddModal = openQuickAddModal;

  window.addEventListener('message', (e) => {
    if (!e.data) return;
    if (e.data.type === 'OPEN_QUICK_ADD') {
      openQuickAddModal(e.data.productId || 'almond');
    } else if (e.data.type === 'ADD_TO_CART' && e.data.item) {
      cartStore.addItem(e.data.item);
      eventBus.emit(Events.CART_OPEN);
    } else if (e.data.type === 'CHATBOT_OPEN_CART') {
      eventBus.emit(Events.CART_OPEN);
    }
  });

  // 7. Bind Checkout Triggers & UI
  const btnRazorpay = document.getElementById('btn-cart-razorpay');
  if (btnRazorpay) {
    btnRazorpay.addEventListener('click', () => {
      checkoutController.startCheckout();
    });
  }

  const deliveryRadios = document.querySelectorAll('input[name="delivery_method"]');
  const pickupHint = document.getElementById('pickup-address-hint');
  const lblShipping = document.getElementById('lbl-method-shipping');
  const lblPickup = document.getElementById('lbl-method-pickup');
  const deliveryPillTag = document.getElementById('delivery-mode-pill-tag');

  const updateCheckoutUI = () => {
    const isPickup = document.querySelector('input[name="delivery_method"]:checked')?.value === 'pickup';
    if (pickupHint) pickupHint.style.display = isPickup ? 'block' : 'none';
    
    if (lblShipping && lblPickup) {
      if (isPickup) {
        lblPickup.style.background = '#2E6B1A';
        lblPickup.style.color = '#FFF';
        lblPickup.style.fontWeight = '700';
        lblPickup.style.boxShadow = '0 2px 6px rgba(46,107,26,0.25)';

        lblShipping.style.background = 'transparent';
        lblShipping.style.color = '#705840';
        lblShipping.style.fontWeight = '600';
        lblShipping.style.boxShadow = 'none';

        if (deliveryPillTag) {
          deliveryPillTag.textContent = 'FREE ₹0';
          deliveryPillTag.style.color = '#2E6B1A';
          deliveryPillTag.style.background = 'rgba(46,107,26,0.12)';
        }
      } else {
        lblShipping.style.background = '#C6960C';
        lblShipping.style.color = '#FFF';
        lblShipping.style.fontWeight = '700';
        lblShipping.style.boxShadow = '0 2px 6px rgba(198,150,12,0.25)';

        lblPickup.style.background = 'transparent';
        lblPickup.style.color = '#705840';
        lblPickup.style.fontWeight = '600';
        lblPickup.style.boxShadow = 'none';

        if (deliveryPillTag) {
          deliveryPillTag.textContent = 'Pan-India / Bengaluru';
          deliveryPillTag.style.color = '#C6960C';
          deliveryPillTag.style.background = 'rgba(198,150,12,0.12)';
        }
      }
    }

    uiController.updateCartUI();

    if (btnRazorpay) {
      btnRazorpay.innerHTML = `
        <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
          <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 14h-2v-2h2v2zm0-4h-2V7h2v5z" />
        </svg>
        <span>Pay & Checkout (Razorpay / UPI / Cards)</span>
      `;
    }
  };

  deliveryRadios.forEach(radio => radio.addEventListener('change', updateCheckoutUI));
  updateCheckoutUI();


  // 8. Initialize Network Monitor & Session Recovery
  initNetworkMonitor();
  checkAndRestoreSession();
}

function checkAndRestoreSession() {
  const saved = getSavedSession();
  if (!saved) return;

  if (saved.type === SessionType.CHECKOUT_PAYMENT || saved.type === SessionType.SHIPPING_DETAILS) {
    showRecoveryBanner(
      "Your checkout session was interrupted. Would you like to resume payment?",
      "Resume Checkout →",
      () => {
        uiController.openCartDrawer();
        setTimeout(() => checkoutController.handleRazorpayCheckout(), 200);
      }
    );
  } else if (saved.type === SessionType.GIFT_BOX_BUILDER) {
    showRecoveryBanner(
      "You were designing a custom bakery gift box.",
      "Continue Box →",
      () => {
        showBoxBuilder();
      }
    );
  } else if (saved.type === SessionType.CART_DRAWER) {
    setTimeout(() => {
      uiController.openCartDrawer();
    }, 600);
  }
}

// Kickstart application on DOM ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', startApp);
} else {
  startApp();
}

// ─── Push Notification Subscription ─────────────────────────────────────────
// Registers the service worker and subscribes the user to push notifications.
// Linked to their phone/email so order confirmations reach them directly.
async function initPushSubscription() {
  if (!('serviceWorker' in navigator) || !('PushManager' in window)) return;

  try {
    const reg = await navigator.serviceWorker.register('/sw.js');
    await navigator.serviceWorker.ready;

    // Check if already subscribed
    let subscription = await reg.pushManager.getSubscription();

    if (!subscription) {
      // Ask for notification permission (only first time)
      const permission = await Notification.requestPermission();
      if (permission !== 'granted') return;

      // Get VAPID public key from server
      const keyRes = await fetch('/api/push/public-key');
      const { publicKey } = await keyRes.json();
      if (!publicKey) return;

      // Convert VAPID key to Uint8Array
      const urlBase64ToUint8Array = (base64String) => {
        const padding = '='.repeat((4 - base64String.length % 4) % 4);
        const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
        const rawData = window.atob(base64);
        return Uint8Array.from([...rawData].map(char => char.charCodeAt(0)));
      };

      subscription = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(publicKey)
      });
    }

    // Read customer details from localStorage to link subscription
    let customerProfile = {};
    try { customerProfile = JSON.parse(localStorage.getItem('user_profile') || '{}'); } catch(e) {}
    const phone = localStorage.getItem('ming_morsels_phone') || customerProfile.phone || '';
    const email = localStorage.getItem('ming_morsels_email') || customerProfile.email || '';

    // Save subscription with customer identifier to server
    await fetch('/api/push/subscribe', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ subscription, customer_phone: phone, customer_email: email })
    });
  } catch (err) {
    // Silent failure — push is optional enhancement
    console.log('[Push] Setup skipped:', err.message);
  }
}

// Init push after a short delay to not block app load
setTimeout(initPushSubscription, 3000);
