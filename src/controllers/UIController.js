// ─────────────────────────────────────────────────────────────────────────────
// UIController.js - Preloader, Dietary Filters, Modals, Navigation & Drawer UI
// ─────────────────────────────────────────────────────────────────────────────

import { gsap } from 'gsap';
import { eventBus, Events } from './EventBus.js';
import { cartStore } from '../services/CartStore.js';
import { saveActiveSession, clearActiveSession, getSavedSession, SessionType } from '../sessionState.js';
import { initFlowingMenu } from '../FlowingMenu.js';
import { createTextType } from '../TextType.js';

export const COOKIE_DATA = {
  almond: { name: "Almond Cookies", description: "Roasted almonds, rich buttery crunch.", price: 180, link: "/product.html?id=almond", image: "/almond_cookie.png" },
  rose: { name: "Rose Petal Cookies", description: "Infused with organic rose petals, delicate aroma.", price: 190, link: "/product.html?id=rose", image: "/rose_cookie.png" },
  oatsnuts: { name: "Oats Nuts Cookies", description: "Rolled oats, mixed crunch nuts, healthy fiber.", price: 170, link: "/product.html?id=oatsnuts", image: "/oatsnuts_cookie.png" },
  orange: { name: "Orange Peel Cookies", description: "Citrus zesty refreshing flavor, sun-dried orange peel.", price: 185, link: "/product.html?id=orange", image: "/almond_cookie.png" },
  walnut: { name: "Walnut Cookies", description: "Rich crunchy California walnuts baked into buttery dough.", price: 210, link: "/product.html?id=walnut", image: "/sugarfree_walnut_cookie.png" },
  walnut_sf: { name: "Sugar-Free Walnut Cookies", description: "Zero added sugar, organic stevia & loaded roasted walnuts.", price: 220, link: "/product.html?id=walnut_sf", image: "/sugarfree_walnut_cookie.png" },
  strawberry: { name: "Strawberry Muffins", description: "Soft and moist, sweet strawberry pockets, crumble top.", price: 140, link: "/product.html?id=strawberry", image: "/strawberry_muffin.png" },
  pineapple: { name: "Pineapple Muffins", description: "Tangy pineapples baked inside butter cake, golden crust.", price: 145, link: "/product.html?id=pineapple", image: "/pineapple_muffin.png" },
  butterscotch: { name: "Butterscotch Muffins", description: "Caramelized cake base with crunchy butterscotch drops.", price: 150, link: "/product.html?id=butterscotch", image: "/butterscotch_muffin.png" },
  choco: { name: "Choco Muffins", description: "Rich double chocolate fudge cake, dark chocolate chunks.", price: 155, link: "/product.html?id=choco", image: "/choco_muffin.png" }
};

export class UIController {
  constructor(threeController = null) {
    this.three = threeController;
  }

  setThreeController(threeController) {
    this.three = threeController;
  }

  init() {
    this.initPixelPreloader();
    this.initDietaryFilterBar();
    this.initNavLinks();
    this.initMobileNavDrawer();
    this.initProductDetailNavigation();
    this.initFlowingMenuSection();
    this.initFooterTextType();
    this.initPolicyModals();
    this.initChatbotWidget();
    this.initSearchModal();
    this.initOrangePeelSlider();
    this.bindCartDrawerEvents();
  }

  initPixelPreloader() {
    const pixelGrid = document.getElementById('pixel-grid');
    const preloader = document.getElementById('preloader');
    const logoBox = document.querySelector('.preloader-logo-box');
    if (!pixelGrid || !preloader) return;

    let isHidden = false;
    const hidePreloader = () => {
      if (isHidden) return;
      isHidden = true;
      preloader.style.opacity = '0';
      preloader.style.pointerEvents = 'none';

      setTimeout(() => {
        preloader.style.display = 'none';
        if (this.three) {
          this.three.update3DCoordinates();
          if (this.three.cookieGroups.almond) {
            this.three.cookieGroups.almond.position.set(this.three.heroAlmondPos.x, this.three.heroAlmondPos.y, 0.5);
            this.three.cookieGroups.almond.scale.set(0.95, 0.95, 0.95);
          }
        }
      }, 300);
    };

    window.addEventListener('load', () => {
      setTimeout(() => {
        if (this.three) this.three.update3DCoordinates();
      }, 150);
    });

    const failSafeTimer = setTimeout(hidePreloader, 1800);

    const cols = 12;
    const rows = 8;
    pixelGrid.innerHTML = '';
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        const tile = document.createElement('div');
        tile.className = 'pixel-tile';
        pixelGrid.appendChild(tile);
      }
    }

    const tl = gsap.timeline();
    if (logoBox) {
      tl.from(logoBox, { scale: 0.85, opacity: 0, duration: 0.45, ease: "back.out(1.5)" });
      tl.to({}, { duration: 0.4 });
      tl.to(logoBox, { scale: 1.1, opacity: 0, duration: 0.3, ease: "power2.in" });
    }

    tl.to('.pixel-tile', {
      scale: 0,
      opacity: 0,
      duration: 0.4,
      ease: "power3.inOut",
      stagger: { grid: [rows, cols], from: "center", amount: 0.4 },
      onComplete: () => {
        clearTimeout(failSafeTimer);
        hidePreloader();
        gsap.from('.hero-subtag-pill, .hero-title, .hero-tagline, .hero-trust-badges, .hero-stats-bar', {
          y: 25,
          opacity: 0,
          duration: 0.7,
          stagger: 0.1,
          ease: "power3.out",
          clearProps: "all"
        });
      }
    }, "-=0.2");
  }

  initDietaryFilterBar() {
    const filterPills = document.querySelectorAll('.dietary-filter-bar .filter-pill');
    const cards = document.querySelectorAll('#products .product-card');

    cards.forEach(card => {
      const cardId = card.getAttribute('data-target');
      card.addEventListener('mouseenter', () => {
        if (this.three?.cookieGroups?.[cardId]) {
          const group = this.three.cookieGroups[cardId];
          if (group.scale?.x > 0.1) {
            gsap.to(group.position, { z: 0.35, duration: 0.35, ease: 'power2.out' });
            gsap.to(group.rotation, { y: '+=0.4', duration: 0.35, ease: 'power2.out' });
          }
        }
      });
      card.addEventListener('mouseleave', () => {
        if (this.three?.cookieGroups?.[cardId]) {
          const group = this.three.cookieGroups[cardId];
          if (group.scale?.x > 0.1) {
            gsap.to(group.position, { z: 0, duration: 0.35, ease: 'power2.out' });
          }
        }
      });
    });

    filterPills.forEach(pill => {
      pill.addEventListener('click', () => {
        filterPills.forEach(p => p.classList.remove('active'));
        pill.classList.add('active');

        const filterTag = pill.getAttribute('data-filter');
        cards.forEach(card => {
          const tags = card.getAttribute('data-tags') || 'all';
          const cardId = card.getAttribute('data-target');
          const isMatch = (filterTag === 'all' || tags.includes(filterTag));
          const group = this.three?.cookieGroups?.[cardId];

          if (isMatch) {
            card.style.display = 'flex';
            gsap.to(card, { opacity: 1, scale: 1, duration: 0.3 });
            if (group && this.three?.placeholder3DCoords?.[cardId]) {
              const targetScale = this.three.placeholder3DCoords[cardId].scale || 0.62;
              gsap.to(group.scale, { x: targetScale, y: targetScale, z: targetScale, duration: 0.3 });
            }
          } else {
            gsap.to(card, { opacity: 0, scale: 0.95, duration: 0.25, onComplete: () => { card.style.display = 'none'; } });
            if (group) gsap.to(group.scale, { x: 0.001, y: 0.001, z: 0.001, duration: 0.25 });
          }
        });
      });
    });
  }

  initNavLinks() {
    document.querySelectorAll('a[href^="#"]').forEach(anchor => {
      anchor.addEventListener('click', (e) => {
        let targetId = anchor.getAttribute('href');
        if (!targetId || targetId === '#') return;
        if (targetId === '#cookies') targetId = '#products';
        e.preventDefault();

        if (targetId === '#home') {
          window.scrollTo({ top: 0, behavior: 'smooth' });
          if (this.three?.cookieGroups?.almond) {
            this.three.cookieGroups.almond.position.set(this.three.heroAlmondPos.x, this.three.heroAlmondPos.y, 0.5);
            this.three.cookieGroups.almond.scale.set(0.95, 0.95, 0.95);
            this.three.cookieGroups.almond.visible = true;
          }
          return;
        }

        const targetEl = document.querySelector(targetId);
        if (targetEl) {
          const top = targetEl.getBoundingClientRect().top + window.scrollY - 70;
          window.scrollTo({ top, behavior: 'smooth' });

          setTimeout(() => {
            if (this.three) {
              this.three.update3DCoordinates();
            }
          }, 350);
        }
      });
    });
  }

  initMobileNavDrawer() {
    const hamburger = document.getElementById('btn-mobile-nav-hamburger');
    const drawer = document.getElementById('mobile-nav-drawer');
    const backdrop = document.getElementById('mobile-nav-backdrop');
    const closeBtn = document.getElementById('btn-close-mobile-nav');

    const openDrawer = () => {
      drawer?.classList.add('active');
      backdrop?.classList.add('active');
      document.body.style.overflow = 'hidden';
    };

    const closeDrawer = () => {
      drawer?.classList.remove('active');
      backdrop?.classList.remove('active');
      document.body.style.overflow = '';
    };

    hamburger?.addEventListener('click', openDrawer);
    closeBtn?.addEventListener('click', closeDrawer);
    backdrop?.addEventListener('click', closeDrawer);
  }

  initProductDetailNavigation() {
    // Navigate directly to dedicated full product page on click (no pop-up modals)
    document.querySelectorAll('.btn-view-details, .btn-card-action[data-target], .product-card').forEach(elem => {
      elem.addEventListener('click', (e) => {
        if (e.target.closest('.btn-add-to-cart, .btn-card-add, [data-action="add-to-cart"]')) {
          return;
        }
        const targetId = elem.getAttribute('data-target') || 
                         elem.getAttribute('data-cookie') || 
                         elem.closest('.product-card')?.getAttribute('data-target') || 
                         elem.closest('.product-card')?.getAttribute('data-cookie') || 
                         'almond';
        if (targetId) {
          window.location.href = `/product.html?id=${targetId}`;
        }
      });
    });
  }

  initFlowingMenuSection() {
    const root = document.getElementById('flowing-menu-root');
    if (!root) return;

    const items = [
      { link: '/product.html?id=almond', text: 'Almond Cookies', image: '/almond_cookie.png' },
      { link: '/product.html?id=rose', text: 'Rose Petal Cookies', image: '/rose_cookie.png' },
      { link: '/product.html?id=oatsnuts', text: 'Oats & Nuts Cookies', image: '/oatsnuts_cookie.png' },
      { link: '/product.html?id=choco', text: 'Choco Muffins', image: '/choco_muffin.png' },
      { link: '/product.html?id=butterscotch', text: 'Butterscotch Muffins', image: '/butterscotch_muffin.png' }
    ];

    initFlowingMenu(root, items, {
      speed: 18,
      textColor: '#FAF6F0',
      bgColor: '#1A0E08',
      marqueeBgColor: '#FAF6F0',
      marqueeTextColor: '#2C1810',
      borderColor: 'rgba(198, 150, 12, 0.4)'
    });
  }

  initFooterTextType() {
    const el = document.getElementById('footer-text-type-heading');
    if (!el) return;

    createTextType(el, {
      text: [
        "✨ Miora Delights Pvt Limited ",
        "🍪 When Moments Matter ",
        "🧈 Pure Cow Butter & Raw Honey ",
        "🌱 Guilt-Free Organic Indulgence "
      ],
      typingSpeed: 30,
      pauseDuration: 1800,
      deletingSpeed: 18,
      showCursor: true,
      cursorCharacter: '|',
      cursorBlinkDuration: 0.4,
      startOnVisible: true,
      textColors: ['#C6960C', '#FAF6F0', '#E4BA84', '#D4A373']
    });
  }

  initPolicyModals() {
    const modalTriggers = [
      { btnId: 'btn-cancellation-refund', modalId: 'modal-cancellation-refunds' },
      { btnId: 'btn-terms-conditions', modalId: 'modal-terms-conditions' },
      { btnId: 'btn-privacy-policy', modalId: 'modal-privacy-policy' },
      { btnId: 'btn-shipping-policy', modalId: 'modal-shipping-policy' }
    ];

    modalTriggers.forEach(({ btnId, modalId }) => {
      const btn = document.getElementById(btnId);
      const modal = document.getElementById(modalId);
      if (btn && modal) {
        btn.addEventListener('click', (e) => {
          e.preventDefault();
          modal.style.display = 'flex';
        });
        modal.querySelector('.policy-modal-close, .btn-close-modal')?.addEventListener('click', () => {
          modal.style.display = 'none';
        });
        modal.addEventListener('click', (e) => {
          if (e.target === modal) modal.style.display = 'none';
        });
      }
    });
  }

  initChatbotWidget() {
    const launcherBtn = document.getElementById('btn-chatbot-launcher') || document.getElementById('btn-chat-toggle');
    const drawer = document.getElementById('chatbot-drawer');
    const closeBtn = document.getElementById('btn-drawer-close') || document.getElementById('btn-close-chatbot');
    const tooltip = document.getElementById('chatbot-tooltip');
    const tooltipClose = document.getElementById('btn-tooltip-close');

    if (!launcherBtn || !drawer) return;

    const toggleChatbot = () => {
      const isOpen = drawer.classList.contains('open');
      if (isOpen) {
        drawer.classList.remove('open', 'active');
        launcherBtn.classList.remove('active');
      } else {
        drawer.classList.add('open', 'active');
        launcherBtn.classList.add('active');
        tooltip?.classList.remove('show');
      }
    };

    launcherBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      toggleChatbot();
    });

    closeBtn?.addEventListener('click', (e) => {
      e.stopPropagation();
      drawer.classList.remove('open', 'active');
      launcherBtn.classList.remove('active');
    });

    tooltipClose?.addEventListener('click', (e) => {
      e.stopPropagation();
      tooltip?.classList.remove('show');
    });

    // Automatically display helpful tooltip after 3 seconds
    setTimeout(() => {
      if (!drawer.classList.contains('open')) {
        tooltip?.classList.add('show');
      }
    }, 3000);
  }

  initSearchModal() {
    const searchModal = document.getElementById('search-modal');
    const searchInput = document.getElementById('search-input');
    const resultsList = document.getElementById('search-results-list');
    const closeBtns = document.querySelectorAll('#btn-search-close, #btn-close-search, .btn-search-close');
    const triggerBtns = document.querySelectorAll('#btn-search, #btn-search-trigger, .header-icon-btn[aria-label="Search"], .btn-search-trigger');

    if (!searchModal) return;

    const openSearch = (e) => {
      e?.preventDefault();
      e?.stopPropagation();
      searchModal.classList.add('open');
      searchModal.style.display = 'flex';
      setTimeout(() => searchInput?.focus(), 50);
      renderSearchResults(searchInput?.value || '');
    };

    const closeSearch = () => {
      searchModal.classList.remove('open');
      setTimeout(() => {
        if (!searchModal.classList.contains('open')) searchModal.style.display = 'none';
      }, 250);
    };

    const renderSearchResults = (query = '') => {
      if (!resultsList) return;
      const q = query.trim().toLowerCase();
      const entries = Object.entries(COOKIE_DATA);
      const matches = q === '' 
        ? entries.slice(0, 6) 
        : entries.filter(([k, item]) => 
            k.toLowerCase().includes(q) ||
            (item.name && item.name.toLowerCase().includes(q)) ||
            (item.description && item.description.toLowerCase().includes(q))
          );

      if (matches.length === 0) {
        resultsList.innerHTML = `
          <div style="text-align:center; padding: 30px; color: rgba(250,246,240,0.6);">
            <p>No confectionery items found matching "${query}".</p>
          </div>
        `;
        return;
      }

      resultsList.innerHTML = matches.map(([id, item]) => `
        <div class="search-result-item" data-id="${id}" style="display:flex; align-items:center; justify-content:space-between; padding:12px 16px; margin-bottom:8px; background:rgba(250,246,240,0.06); border-radius:10px; border:1px solid rgba(200,150,12,0.2); cursor:pointer;">
          <div style="display:flex; align-items:center; gap:14px;">
            <img src="${item.image || '/img-almond.png'}" alt="${item.name}" style="width:48px; height:48px; border-radius:8px; object-fit:cover;" onerror="this.src='/img-almond.png'" />
            <div style="text-align:left;">
              <h4 style="margin:0; font-size:15px; color:#FAF6F0;">${item.name}</h4>
              <p style="margin:2px 0 0; font-size:12px; color:rgba(250,246,240,0.6);">${item.description}</p>
              <span style="font-size:13px; font-weight:700; color:#C8960C;">₹${item.price}</span>
            </div>
          </div>
          <button class="btn-search-add" data-id="${id}" style="background:#C8960C; color:#1A0E08; border:none; padding:8px 14px; border-radius:6px; font-weight:700; font-size:12px; cursor:pointer;">+ Add</button>
        </div>
      `).join('');

      resultsList.querySelectorAll('.btn-search-add').forEach(btn => {
        btn.addEventListener('click', (e) => {
          e.stopPropagation();
          const targetId = btn.getAttribute('data-id');
          if (targetId && COOKIE_DATA[targetId]) {
            cartStore.addItem({
              id: targetId,
              name: COOKIE_DATA[targetId].name,
              price: COOKIE_DATA[targetId].price,
              image: COOKIE_DATA[targetId].image,
              quantity: 1
            });
            closeSearch();
            this.openCartDrawer();
          }
        });
      });

      resultsList.querySelectorAll('.search-result-item').forEach(itemEl => {
        itemEl.addEventListener('click', (e) => {
          if (e.target.closest('.btn-search-add')) return;
          const targetId = itemEl.getAttribute('data-id');
          if (targetId) window.location.href = `/product.html?id=${targetId}`;
        });
      });
    };

    triggerBtns.forEach(btn => btn.addEventListener('click', openSearch));
    closeBtns.forEach(btn => btn.addEventListener('click', closeSearch));

    searchInput?.addEventListener('input', (e) => {
      renderSearchResults(e.target.value);
    });

    searchModal.addEventListener('click', (e) => {
      if (e.target === searchModal) closeSearch();
    });

    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && searchModal.classList.contains('open')) closeSearch();
    });
  }

  initOrangePeelSlider() {
    const sliderModal = document.getElementById('orange-peel-slider-modal');
    const sliderCloseBtn = document.getElementById('slider-close');
    sliderCloseBtn?.addEventListener('click', () => {
      sliderModal?.classList.remove('active');
    });
  }

  bindCartDrawerEvents() {
    const cartTriggers = document.querySelectorAll('#btn-cart, #btn-cart-trigger, .cart-btn, .header-icon-btn[aria-label="Shopping Cart"], .btn-cart-trigger');
    const closeBtns = document.querySelectorAll('#btn-cart-close, #btn-close-cart-drawer, .btn-cart-close');
    const backdrop = document.getElementById('cart-drawer-backdrop');

    cartTriggers.forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        this.openCartDrawer();
      });
    });

    closeBtns.forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        this.closeCartDrawer();
      });
    });

    backdrop?.addEventListener('click', () => {
      this.closeCartDrawer();
    });

    // Pincode Check inside Cart or Header
    const btnCheckPincode = document.getElementById('btn-check-pincode') || document.getElementById('btn-pincode-check');
    const pincodeInput = document.getElementById('pincode-input') || document.getElementById('cart-pincode-input');
    const pincodeResult = document.getElementById('pincode-result') || document.getElementById('cart-pincode-msg');

    if (btnCheckPincode && pincodeInput) {
      btnCheckPincode.addEventListener('click', async (e) => {
        e.preventDefault();
        const code = pincodeInput.value.trim();
        if (!code || code.length < 6) {
          if (pincodeResult) {
            pincodeResult.textContent = 'Please enter a valid 6-digit pincode.';
            pincodeResult.style.color = '#E74C3C';
          }
          return;
        }
        btnCheckPincode.textContent = '...';
        try {
          const res = await fetch(`/api/pincode/check?pincode=${encodeURIComponent(code)}`);
          const data = await res.json();
          btnCheckPincode.textContent = 'Check';
          if (pincodeResult) {
            if (data.serviceable) {
              pincodeResult.textContent = `✅ ${data.area}: ${data.estTime} (₹${data.deliveryFee ?? 49} delivery · Free above ₹${data.freeDeliveryAbove ?? 499})`;
              pincodeResult.style.color = '#27AE60';
            } else {
              pincodeResult.textContent = '❌ Delivery currently unavailable for this pincode.';
              pincodeResult.style.color = '#E74C3C';
            }
          }
        } catch (err) {
          btnCheckPincode.textContent = 'Check';
        }
      });
    }

    // Coupon Code Apply in Cart
    const btnApplyCoupon = document.getElementById('btn-apply-coupon');
    const couponInput = document.getElementById('cart-coupon-input');
    const couponMsg = document.getElementById('cart-coupon-msg');

    if (btnApplyCoupon && couponInput) {
      btnApplyCoupon.addEventListener('click', (e) => {
        e.preventDefault();
        const code = couponInput.value.trim().toUpperCase();
        if (code === 'FIRSTBITE') {
          if (couponMsg) {
            couponMsg.textContent = '✨ 15% Connoisseur discount applied!';
            couponMsg.style.color = '#27AE60';
          }
        } else if (code === 'LUXURY50') {
          if (couponMsg) {
            couponMsg.textContent = '✨ Flat ₹50 luxury discount applied!';
            couponMsg.style.color = '#27AE60';
          }
        } else if (code) {
          if (couponMsg) {
            couponMsg.textContent = 'Invalid promo code. Try FIRSTBITE or LUXURY50';
            couponMsg.style.color = '#E74C3C';
          }
        }
      });
    }

    document.addEventListener('click', (e) => {
      const inc = e.target.closest('.inc-btn, .btn-cart-qty-add');
      if (inc) {
        e.preventDefault();
        e.stopPropagation();
        const id = inc.getAttribute('data-cookie') || inc.getAttribute('data-id');
        if (id) cartStore.incrementItem(id);
        return;
      }
      const dec = e.target.closest('.dec-btn, .btn-cart-qty-sub');
      if (dec) {
        e.preventDefault();
        e.stopPropagation();
        const id = dec.getAttribute('data-cookie') || dec.getAttribute('data-id');
        if (id) cartStore.decrementItem(id);
        return;
      }
    });

    eventBus.on(Events.CART_OPEN, () => this.openCartDrawer());
    eventBus.on(Events.CART_CLOSE, () => this.closeCartDrawer());
    cartStore.subscribe(() => this.updateCartUI());
  }

  openCartDrawer() {
    saveActiveSession(SessionType.CART_DRAWER);
    const cartDrawer = document.getElementById('cart-drawer');
    const backdrop = document.getElementById('cart-drawer-backdrop');
    cartDrawer?.classList.add('active', 'open');
    backdrop?.classList.add('active', 'open');
    if (cartDrawer) cartDrawer.style.display = 'flex';
    if (backdrop) backdrop.style.display = 'block';
    this.updateCartUI();
  }

  closeCartDrawer() {
    const cur = getSavedSession();
    if (cur?.type === SessionType.CART_DRAWER) clearActiveSession();
    const cartDrawer = document.getElementById('cart-drawer');
    const backdrop = document.getElementById('cart-drawer-backdrop');
    cartDrawer?.classList.remove('active', 'open');
    backdrop?.classList.remove('active', 'open');
    setTimeout(() => {
      if (cartDrawer && !cartDrawer.classList.contains('open')) cartDrawer.style.display = '';
      if (backdrop && !backdrop.classList.contains('open')) backdrop.style.display = '';
    }, 300);
  }

  updateCartUI() {
    const cartItems = cartStore.getItems();
    const cartCountBadges = document.querySelectorAll('#cart-count-badge, .cart-badge, .cart-count-badge');
    const cartDrawerBody = document.getElementById('cart-drawer-body');
    const cartTotalPrice = document.getElementById('cart-total-price');

    const totalCount = cartStore.getTotalCount();
    const subtotal = cartStore.getSubtotal();

    cartCountBadges.forEach(badge => {
      badge.textContent = totalCount;
      badge.style.display = totalCount > 0 ? 'inline-flex' : 'none';
    });

    const gst = Math.round(subtotal * 0.05);
    const estimatedTotal = subtotal + gst;

    if (cartTotalPrice) cartTotalPrice.textContent = `₹${subtotal}`;
    const cartGstPrice = document.getElementById('cart-gst-price');
    if (cartGstPrice) cartGstPrice.textContent = `+₹${gst}`;
    const cartGrandTotal = document.getElementById('cart-grand-total');
    if (cartGrandTotal) cartGrandTotal.textContent = `₹${estimatedTotal}`;

    if (cartDrawerBody) {
      if (cartItems.length === 0) {
        cartDrawerBody.innerHTML = `
          <div class="cart-empty-message" style="text-align:center; padding: 40px 20px; color:#8C7355;">
            <span class="cart-empty-icon" style="font-size:48px; display:block; margin-bottom:12px;">🛒</span>
            <p style="font-family:Georgia, serif; font-size:16px; margin:0;">Your basket is currently empty.</p>
            <p style="font-size:12px; margin-top:6px; opacity:0.8;">Explore our signature cookies &amp; artisanal muffins.</p>
          </div>
        `;
      } else {
        cartDrawerBody.innerHTML = '';
        cartItems.forEach(item => {
          const row = document.createElement('div');
          row.className = 'cart-item-row';
          row.style.cssText = 'display:flex; align-items:center; justify-content:space-between; padding:12px 0; border-bottom:1px solid #EADCCB;';
          row.innerHTML = `
            <div class="cart-item-thumb" style="width:48px; height:48px; border-radius:8px; overflow:hidden; background:#FFF; flex-shrink:0;">
              <img src="${item.image || '/almond_cookie.png'}" alt="${item.name}" style="width:100%; height:100%; object-fit:cover;" onerror="this.src='/almond_cookie.png'" />
            </div>
            <div class="cart-item-detail" style="flex:1; margin:0 12px; text-align:left;">
              <h4 class="cart-item-title" style="margin:0; font-size:13px; font-weight:700; color:#3D2000;">${item.name}</h4>
              <span class="cart-item-price" style="font-size:12px; font-weight:700; color:#C8960C;">₹${item.price}</span>
            </div>
            <div class="cart-qty-controls" style="display:flex; align-items:center; gap:8px;">
              <button class="cart-qty-btn dec-btn" data-cookie="${item.id}" style="width:24px; height:24px; border-radius:4px; border:1px solid #C8960C; background:#FFF; font-weight:700; cursor:pointer;">-</button>
              <span class="cart-qty-val" style="font-size:13px; font-weight:700; min-width:16px; text-align:center;">${item.quantity}</span>
              <button class="cart-qty-btn inc-btn" data-cookie="${item.id}" style="width:24px; height:24px; border-radius:4px; border:1px solid #C8960C; background:#C8960C; color:#FFF; font-weight:700; cursor:pointer;">+</button>
            </div>
          `;
          cartDrawerBody.appendChild(row);
        });

        // ── AI Recommendation Strip ───────────────────────────────────────────
        const recommendations = this._getAIRecommendations(cartItems);
        if (recommendations.length > 0) {
          const aiStrip = document.createElement('div');
          aiStrip.className = 'ai-rec-strip';
          aiStrip.innerHTML = `
            <div class="ai-rec-header">
              <span class="ai-rec-icon">✨</span>
              <span class="ai-rec-label">AI Pick for You</span>
              <span class="ai-rec-sub">Pairs perfectly with your order</span>
            </div>
            <div class="ai-rec-chips">
              ${recommendations.map(rec => `
                <div class="ai-rec-chip">
                  <div class="ai-rec-chip-img">
                    <img src="${rec.image}" alt="${rec.name}" onerror="this.src='/almond_cookie.png'" />
                  </div>
                  <div class="ai-rec-chip-info">
                    <span class="ai-rec-chip-name">${rec.name}</span>
                    <span class="ai-rec-chip-price">₹${rec.price}</span>
                    <span class="ai-rec-chip-reason">${rec.reason}</span>
                  </div>
                  <button class="ai-rec-add-btn" data-id="${rec.id}">+ Add</button>
                </div>
              `).join('')}
            </div>
          `;
          cartDrawerBody.appendChild(aiStrip);

          aiStrip.querySelectorAll('.ai-rec-add-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
              e.preventDefault();
              e.stopPropagation();
              const id = btn.getAttribute('data-id');
              if (id && COOKIE_DATA[id]) {
                cartStore.addItem({
                  id,
                  name: COOKIE_DATA[id].name,
                  price: COOKIE_DATA[id].price,
                  image: COOKIE_DATA[id].image,
                  quantity: 1
                });
                btn.textContent = '✓ Added!';
                btn.style.background = '#2E6B1A';
                btn.style.color = '#FFF';
                setTimeout(() => { btn.textContent = '+ Add'; btn.style.background = ''; btn.style.color = ''; }, 1800);
              }
            });
          });
        }
        // ─────────────────────────────────────────────────────────────────────

        cartDrawerBody.querySelectorAll('.inc-btn').forEach(btn => {
          btn.addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation();
            const id = btn.getAttribute('data-cookie');
            if (id) cartStore.incrementItem(id);
          });
        });

        cartDrawerBody.querySelectorAll('.dec-btn').forEach(btn => {
          btn.addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation();
            const id = btn.getAttribute('data-cookie');
            if (id) cartStore.decrementItem(id);
          });
        });
      }
    }
  }

  /**
   * AI Recommendation Engine — rule-based pairing matrix.
   * Cookies → suggest muffins, Muffins → suggest cookies.
   * Never recommends items already in the cart.
   */
  _getAIRecommendations(cartItems) {
    // Base product keys, sorted longest-first so walnut_sf matches before walnut
    const BASE_KEYS = ['walnut_sf', 'almond', 'rose', 'oatsnuts', 'orange',
                       'walnut', 'strawberry', 'pineapple', 'butterscotch', 'choco'];

    // Resolve a raw cart ID (e.g. "oatsnuts_snack_2pcs") to its base key ("oatsnuts")
    const toBaseKey = (id) => {
      const raw = String(id || '').toLowerCase();
      return BASE_KEYS.find(k => raw === k || raw.startsWith(k + '_')) || null;
    };

    // Build a set of base keys already in the cart
    const cartBaseKeys = new Set(cartItems.map(i => toBaseKey(i.id)).filter(Boolean));

    const PAIRS = {
      almond:       [{ id: 'rose',         reason: 'Floral contrast to nutty almond' },
                     { id: 'choco',        reason: 'Classic nut + chocolate combo' }],
      rose:         [{ id: 'butterscotch', reason: 'Caramel sweetness with floral notes' },
                     { id: 'almond',       reason: 'Nutty base complements rose' }],
      oatsnuts:     [{ id: 'strawberry',   reason: 'Fruity freshness with wholesome oats' },
                     { id: 'choco',        reason: 'Chocolate fudge with nutty crunch' }],
      orange:       [{ id: 'pineapple',    reason: 'Double the tropical citrus punch' },
                     { id: 'rose',         reason: 'Floral & citrus make a perfect pair' }],
      walnut:       [{ id: 'choco',        reason: 'Walnut + dark choco — a classic' },
                     { id: 'butterscotch', reason: 'Caramel glaze on walnut richness' }],
      walnut_sf:    [{ id: 'oatsnuts',     reason: 'Both wholesome & guilt-free' },
                     { id: 'almond',       reason: 'Double nut, double the protein' }],
      strawberry:   [{ id: 'rose',         reason: 'Berry & floral — a tea-time duo' },
                     { id: 'oatsnuts',     reason: 'Balance moist muffin with crunch' }],
      pineapple:    [{ id: 'orange',       reason: 'Tropical citrus duo — a summer hit' },
                     { id: 'butterscotch', reason: 'Caramel cuts through tropical tang' }],
      butterscotch: [{ id: 'almond',       reason: 'Caramel + nut — indulgent perfection' },
                     { id: 'walnut',       reason: 'Double crunch, double the joy' }],
      choco:        [{ id: 'almond',       reason: 'Nut crunch against chocolate fudge' },
                     { id: 'strawberry',   reason: 'Choco + berry — a crowd favourite' }],
    };

    const seen = new Set();
    const results = [];

    for (const item of cartItems) {
      const baseKey = toBaseKey(item.id);
      if (!baseKey) continue;
      const pairings = PAIRS[baseKey] || [];
      for (const pair of pairings) {
        if (!cartBaseKeys.has(pair.id) && !seen.has(pair.id) && COOKIE_DATA[pair.id]) {
          seen.add(pair.id);
          results.push({
            id: pair.id,
            name: COOKIE_DATA[pair.id].name,
            price: COOKIE_DATA[pair.id].price,
            image: COOKIE_DATA[pair.id].image,
            reason: pair.reason
          });
          if (results.length >= 2) return results;
        }
      }
    }
    return results;
  }
}

export const uiController = new UIController();
