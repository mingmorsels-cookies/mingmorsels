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
import { initNetworkMonitor, saveActiveSession, getSavedSession, showRecoveryBanner, SessionType } from './sessionState.js';

import { openQuickAddModal } from './controllers/QuickAddModal.js';
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
      cartStore.addItem(pairItem);
      uiController.openCartDrawer();
    });
    initSocialGallery();

    document.getElementById('btn-open-gift-builder')?.addEventListener('click', () => {
      saveActiveSession(SessionType.GIFT_BOX_BUILDER);
      showBoxBuilder();
    });
    document.getElementById('btn-open-flavor-quiz')?.addEventListener('click', showPairingQuiz);
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

  // 7. Bind Checkout Triggers
  document.getElementById('btn-cart-razorpay')?.addEventListener('click', () => {
    checkoutController.startCheckout();
  });

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
