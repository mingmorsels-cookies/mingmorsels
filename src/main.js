// ─────────────────────────────────────────────────────────────────────────────
// Ming Morsels - High-Performance Modular Application Entrypoint
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
import { initDomeGallery } from './DomeGallery.js';
import { initParticleText } from './ParticleText.js';
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
    const domeRoot = document.getElementById('dome-gallery-root');
    if (domeRoot) initDomeGallery(domeRoot);

    const particleTextRoot = document.getElementById('particle-text-root');
    if (particleTextRoot) {
      initParticleText(particleTextRoot, {
        text: 'Unit of Miora Delights Private Limited',
        textAlign: 'left',
        particleSize: 3.2,
        density: 1.5, // Dense and solid glyph definition
        color: '#0F0600', // Deepest dark roast espresso for 100% contrast & readability
        highlightColor: '#3A1E04',
        scatter: 190,
        gatherDuration: 1300,
        stagger: 320,
        pointerRepel: 50,
        repelRadius: 130,
        idleDrift: 0.5,
        trigger: 'hover',
        fontSize: 'clamp(2rem, 4.4vw, 3.4rem)', // Noticeably larger, bold font
        fontWeight: 800,
        fontFamily: 'Inter, system-ui, -apple-system, sans-serif',
        glow: false
      });
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
  const paymentRadios = document.querySelectorAll('input[name="payment_method"]');
  const pickupHint = document.getElementById('pickup-address-hint');

  const updateCheckoutUI = () => {
    const isPickup = document.querySelector('input[name="delivery_method"]:checked')?.value === 'pickup';
    const isCOD = document.querySelector('input[name="payment_method"]:checked')?.value === 'cod';

    if (pickupHint) pickupHint.style.display = isPickup ? 'block' : 'none';
    if (btnRazorpay) {
      if (isCOD) {
        btnRazorpay.innerHTML = '<span>Place Order (Cash on Delivery)</span>';
      } else {
        btnRazorpay.innerHTML = `
          <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
            <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 14h-2v-2h2v2zm0-4h-2V7h2v5z" />
          </svg>
          <span>Pay & Checkout (Razorpay / UPI / Cards)</span>
        `;
      }
    }
  };

  deliveryRadios.forEach(radio => radio.addEventListener('change', updateCheckoutUI));
  paymentRadios.forEach(radio => radio.addEventListener('change', updateCheckoutUI));
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
