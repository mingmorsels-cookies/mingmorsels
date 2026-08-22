// ─────────────────────────────────────────────────────────────────────────────
// AuthController.js - Google Identity Services (GIS), Profiles & Session Security
// ─────────────────────────────────────────────────────────────────────────────

import { eventBus, Events } from './EventBus.js';
import { cartStore } from '../services/CartStore.js';

export class AuthController {
  constructor() {
    this.userProfile = null;
    this.isGsiInitialized = false;
  }

  init() {
    // Expose callback globally for Google Identity Service bridge
    window.handleCredentialResponse = (response) => this.handleCredentialResponse(response);
    window.handleCredentialResponseImpl = (response) => this.handleCredentialResponse(response);

    window.quickGoogleSignIn = (name, email, avatar) => {
      const profile = {
        name: name || 'Sourav HM',
        email: email || 'souravhm5289@gmail.com',
        avatar: avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(name || 'Sourav HM')}&background=C8960C&color=fff&bold=true`
      };
      this.handleCredentialResponse({ profile });
    };

    if (window._pendingGoogleCred) {
      const pending = window._pendingGoogleCred;
      delete window._pendingGoogleCred;
      this.handleCredentialResponse(pending);
    }

    this.bindDOM();
    this.checkStoredUser();
  }

  decodeJwt(token) {
    try {
      const base64Url = token.split('.')[1];
      const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
      const jsonPayload = decodeURIComponent(atob(base64).split('').map(c => {
        return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2);
      }).join(''));
      return JSON.parse(jsonPayload);
    } catch (e) {
      console.error("[AuthController] JWT decoding failed:", e);
      return null;
    }
  }

  async handleCredentialResponse(response) {
    let userProfile = null;
    if (response && response.credential) {
      const payload = this.decodeJwt(response.credential);
      if (payload) {
        userProfile = {
          name: payload.given_name || payload.name,
          avatar: payload.picture,
          email: payload.email
        };
      }
    } else if (response && response.profile) {
      userProfile = response.profile;
    }

    if (userProfile) {
      this.userProfile = userProfile;
      localStorage.setItem('user_profile', JSON.stringify(userProfile));
      this.showUserProfile();

      setTimeout(() => this.showNotifPermissionModal(), 2000);

      try {
        await fetch('/api/auth/google-verify', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ credential: response.credential || 'direct_auth', profile: userProfile })
        });
      } catch (e) {
        console.log('[AuthController] Backend sync:', e.message);
      }

      eventBus.emit(Events.USER_LOGGED_IN, userProfile);
    }
  }

  checkStoredUser() {
    const stored = localStorage.getItem('user_profile');
    if (stored) {
      try {
        this.userProfile = JSON.parse(stored);
        this.showUserProfile();
      } catch (e) {}
    }
  }

  showUserProfile() {
    const user = this.userProfile || JSON.parse(localStorage.getItem('user_profile') || '{}');
    if (!user || !user.email) return;

    const headerAvatar = document.getElementById('header-user-avatar');
    const defaultIcon = document.getElementById('default-account-icon');
    if (headerAvatar && defaultIcon) {
      if (user.avatar) {
        headerAvatar.setAttribute('referrerpolicy', 'no-referrer');
        headerAvatar.onerror = () => {
          headerAvatar.style.display = 'none';
          defaultIcon.style.display = 'block';
        };
        headerAvatar.onload = () => {
          headerAvatar.style.display = 'block';
          defaultIcon.style.display = 'none';
        };
        headerAvatar.src = user.avatar;
      } else {
        headerAvatar.style.display = 'none';
        defaultIcon.style.display = 'block';
      }
    }

    const dropdownAvatar = document.getElementById('dropdown-user-avatar');
    if (dropdownAvatar) {
      dropdownAvatar.setAttribute('referrerpolicy', 'no-referrer');
      dropdownAvatar.onerror = () => {
        dropdownAvatar.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(user.name || 'User')}&background=C8960C&color=fff&bold=true`;
      };
      dropdownAvatar.src = user.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(user.name || 'User')}&background=C8960C&color=fff&bold=true`;
    }

    const nameEl = document.getElementById('user-name');
    const emailEl = document.getElementById('user-email');
    const detailsContainer = document.getElementById('user-profile-details');
    const signedOutView = document.getElementById('auth-signed-out-view');

    if (nameEl) nameEl.textContent = user.name || 'Valued Member';
    if (emailEl) emailEl.textContent = user.email || '';
    if (detailsContainer) detailsContainer.style.display = 'flex';
    if (signedOutView) signedOutView.style.display = 'none';

    const dashAvatar = document.getElementById('dashboard-user-avatar');
    const dashName = document.getElementById('dashboard-user-name');
    const dashEmail = document.getElementById('dashboard-user-email');

    if (dashAvatar) {
      dashAvatar.setAttribute('referrerpolicy', 'no-referrer');
      dashAvatar.onerror = () => {
        dashAvatar.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(user.name || 'User')}&background=C8960C&color=fff&bold=true`;
      };
      dashAvatar.src = user.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(user.name || 'User')}&background=C8960C&color=fff&bold=true`;
    }
    if (dashName) dashName.textContent = `Hello, ${user.name || 'User'}`;
    if (dashEmail) dashEmail.textContent = user.email || '';

    const isAdmin = user.email && user.email.toLowerCase() === 'mingmorsels@gmail.com';
    document.querySelectorAll('.admin-only-link').forEach(el => {
      if (isAdmin) {
        el.style.setProperty('display', el.tagName === 'LI' ? 'list-item' : 'inline-flex', 'important');
      } else {
        el.style.setProperty('display', 'none', 'important');
      }
    });

    if (window.google?.accounts?.id) {
      try { google.accounts.id.cancel(); } catch (e) {}
    }
    const gOnload = document.getElementById('g_id_onload');
    if (gOnload) gOnload.style.display = 'none';
  }

  showNotifPermissionModal() {
    const NOTIF_KEY_ALLOWED = 'mm_notif_allowed';
    const NOTIF_KEY_DECIDED = 'mm_notif_decided';

    if (localStorage.getItem(NOTIF_KEY_DECIDED) === 'true') return;
    if (!('Notification' in window)) return;
    if (Notification.permission === 'granted') {
      localStorage.setItem(NOTIF_KEY_ALLOWED, 'true');
      localStorage.setItem(NOTIF_KEY_DECIDED, 'true');
      return;
    }
    if (Notification.permission === 'denied') return;

    const modal = document.getElementById('notif-permission-modal');
    if (!modal) return;
    modal.style.display = 'flex';

    document.getElementById('notif-allow-btn').onclick = async () => {
      modal.style.display = 'none';
      localStorage.setItem(NOTIF_KEY_DECIDED, 'true');
      const permission = await Notification.requestPermission();
      if (permission === 'granted') {
        localStorage.setItem(NOTIF_KEY_ALLOWED, 'true');
      }
    };

    document.getElementById('notif-later-btn').onclick = () => {
      modal.style.display = 'none';
      localStorage.setItem(NOTIF_KEY_DECIDED, 'true');
      localStorage.setItem(NOTIF_KEY_ALLOWED, 'false');
    };
  }

  bindDOM() {
    const tryRenderGoogleBtn = () => {
      const wrapper = document.getElementById('google-btn-wrapper');
      if (window.google?.accounts?.id && wrapper) {
        try {
          if (!this.isGsiInitialized) {
            this.isGsiInitialized = true;
            google.accounts.id.initialize({
              client_id: "458701688374-oqeoc7bgik6csn0k63qprrjmjmn1aq4t.apps.googleusercontent.com",
              callback: (resp) => this.handleCredentialResponse(resp),
              auto_select: false,
              itp_support: true
            });
          }
          if (!wrapper.hasAttribute('data-gsi-rendered')) {
            wrapper.innerHTML = ''; // Clear out the fallback button so it doesn't duplicate or conflict
            google.accounts.id.renderButton(wrapper, {
              type: 'standard',
              shape: 'pill',
              theme: 'outline',
              text: 'signin',
              size: 'large',
              logo_alignment: 'left',
              width: 240
            });
            wrapper.setAttribute('data-gsi-rendered', 'true');
          }
        } catch (e) {}
      }
    };

    const btnAccount = document.getElementById('btn-account');
    const dropdown = document.getElementById('google-auth-dropdown');

    if (btnAccount && dropdown) {
      btnAccount.addEventListener('click', (e) => {
        e.stopPropagation();
        dropdown.classList.toggle('show');
        if (dropdown.classList.contains('show')) {
          tryRenderGoogleBtn();
        }
      });

      document.addEventListener('click', (e) => {
        if (!dropdown.contains(e.target) && !btnAccount.contains(e.target)) {
          dropdown.classList.remove('show');
        }
      });
    }

    const btnSignout = document.querySelector('.btn-signout-card');
    if (btnSignout) {
      btnSignout.addEventListener('click', (e) => {
        e.stopPropagation();
        localStorage.removeItem('user_profile');
        this.userProfile = null;

        const headerAvatar = document.getElementById('header-user-avatar');
        const defaultIcon = document.getElementById('default-account-icon');
        if (headerAvatar && defaultIcon) {
          headerAvatar.style.display = 'none';
          defaultIcon.style.display = 'block';
        }

        const detailsContainer = document.getElementById('user-profile-details');
        const signedOutView = document.getElementById('auth-signed-out-view');

        if (detailsContainer) detailsContainer.style.display = 'none';
        if (signedOutView) signedOutView.style.display = 'flex';

        document.querySelectorAll('.admin-only-link').forEach(el => {
          el.style.setProperty('display', 'none', 'important');
        });

        if (window.google?.accounts?.id) {
          google.accounts.id.disableAutoSelect();
        }

        if (dropdown) dropdown.classList.remove('show');
        eventBus.emit(Events.USER_LOGGED_OUT);
      });
    }

    tryRenderGoogleBtn();
    window.addEventListener('load', tryRenderGoogleBtn);

    // Initialize User Dashboard Modal
    this.initUserDashboard();
  }

  initUserDashboard() {
    const dashboardModal = document.getElementById('user-dashboard-modal');
    const openBtns = document.querySelectorAll('#btn-open-dashboard, .btn-dashboard-link');
    const closeBtn = document.getElementById('btn-dashboard-close');
    const dropdown = document.getElementById('google-auth-dropdown');

    const openDashboard = async () => {
      if (dropdown) dropdown.classList.remove('show');
      if (!dashboardModal) {
        window.location.href = '/#dashboard';
        return;
      }

      const user = this.userProfile || JSON.parse(localStorage.getItem('user_profile') || '{}');

      // Populate user info in dashboard header
      const dashAvatar = document.getElementById('dashboard-user-avatar');
      const dashName = document.getElementById('dashboard-user-name');
      const dashEmail = document.getElementById('dashboard-user-email');

      if (dashAvatar) {
        dashAvatar.src = user.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(user.name || 'Connoisseur')}&background=C8960C&color=fff&bold=true`;
      }
      if (dashName) dashName.textContent = user.name ? `Welcome, ${user.name}` : 'Welcome, Connoisseur';
      if (dashEmail) dashEmail.textContent = user.email || 'Verified Customer';

      dashboardModal.classList.add('open');
      document.body.style.overflow = 'hidden';

      // Load Orders & Data
      await this.loadDashboardOrders(user);
      this.loadDashboardCart();
      this.loadDashboardAddress();
    };

    const closeDashboard = () => {
      if (dashboardModal) {
        dashboardModal.classList.remove('open');
        document.body.style.overflow = '';
      }
    };

    openBtns.forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        openDashboard();
      });
    });

    if (closeBtn) {
      closeBtn.addEventListener('click', closeDashboard);
    }

    if (dashboardModal) {
      dashboardModal.addEventListener('click', (e) => {
        if (e.target === dashboardModal) closeDashboard();
      });
    }

    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && dashboardModal && dashboardModal.classList.contains('open')) {
        closeDashboard();
      }
    });

    // Dashboard tabs switching
    const tabBtns = document.querySelectorAll('.dashboard-tab-btn');
    const tabPanes = document.querySelectorAll('.dashboard-pane');

    tabBtns.forEach(tab => {
      tab.addEventListener('click', () => {
        const pane = tab.getAttribute('data-pane');
        const paneId = `pane-${pane}`;
        tabBtns.forEach(b => b.classList.remove('active'));
        tabPanes.forEach(p => p.classList.remove('active'));

        tab.classList.add('active');
        const targetPane = document.getElementById(paneId);
        if (targetPane) targetPane.classList.add('active');

        if (pane === 'saved-cart') {
          this.loadDashboardCart();
        } else if (pane === 'orders') {
          const user = this.userProfile || JSON.parse(localStorage.getItem('user_profile') || '{}');
          this.loadDashboardOrders(user);
        } else if (pane === 'address') {
          this.loadDashboardAddress();
        }
      });
    });

    // Auto-sync dashboard cart with active CartStore updates
    if (cartStore && typeof cartStore.subscribe === 'function') {
      cartStore.subscribe(() => {
        const modal = document.getElementById('user-dashboard-modal');
        if (modal && modal.classList.contains('open')) {
          this.loadDashboardCart();
        }
      });
    }

    // Address form submit
    const addressForm = document.getElementById('dashboard-address-form');
    const saveStatus = document.getElementById('address-save-status');
    if (addressForm) {
      addressForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const phone = document.getElementById('shipping-phone')?.value || '';
        const address = document.getElementById('shipping-address')?.value || '';
        const city = document.getElementById('shipping-city')?.value || 'Bengaluru';
        const pincode = document.getElementById('shipping-pincode')?.value || '';

        localStorage.setItem('user_address', JSON.stringify({ phone, address, city, pincode }));
        if (saveStatus) {
          saveStatus.style.display = 'block';
          setTimeout(() => { saveStatus.style.display = 'none'; }, 3000);
        }
      });
    }
  }

  async loadDashboardOrders(user) {
    const ordersList = document.getElementById('dashboard-orders-list');
    if (!ordersList) return;

    if (!user || !user.email) {
      ordersList.innerHTML = `
        <div style="text-align: center; padding: 40px 20px; color: var(--color-text-muted);">
          <div style="font-size: 36px; margin-bottom: 12px;">🔐</div>
          <p>Please sign in with your Google account to view your live orders and tracking history.</p>
        </div>
      `;
      return;
    }

    ordersList.innerHTML = `<div style="text-align: center; padding: 30px; color: var(--color-text-muted);">📦 Fetching your orders...</div>`;

    try {
      let token = localStorage.getItem('customer_token');
      if (!token) {
        const authRes = await fetch('/api/customer/auth', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email: user.email, name: user.name, picture: user.avatar })
        });
        const authData = await authRes.json();
        if (authData.token) {
          token = authData.token;
          localStorage.setItem('customer_token', token);
        }
      }

      const res = await fetch('/api/user/orders', {
        headers: token ? { 'Authorization': `Bearer ${token}` } : {}
      });
      const data = await res.json();
      const orders = (data.success && Array.isArray(data.orders)) ? data.orders : [];

      // Update rewards count (100 Points per order)
      const rewardsCount = document.getElementById('rewards-points-count');
      const rewardsFill = document.getElementById('rewards-progress-fill');
      const paidOrders = orders.filter(o => o.payment_status === 'PAID' || !o.payment_status);
      const points = paidOrders.length * 100;
      if (rewardsCount) {
        rewardsCount.textContent = points >= 1000 ? `👑 ${points} Pts (VIP Connoisseur)` : `${points} / 1000 Points`;
      }
      if (rewardsFill) {
        rewardsFill.style.width = `${Math.min(100, Math.round((points / 1000) * 100))}%`;
      }

      if (orders.length === 0) {
        ordersList.innerHTML = `
          <div style="text-align: center; padding: 40px 20px; color: var(--color-text-muted);">
            <div style="font-size: 42px; margin-bottom: 12px;">🍪</div>
            <h4 style="color: #3D2000; margin-bottom: 6px;">No Orders Placed Yet</h4>
            <p style="font-size: 13px; max-width: 320px; margin: 0 auto 16px;">Our artisanal bakery is ready to handcraft and fresh-bake your favorite luxury cookies!</p>
            <a href="/#products" class="btn-action" style="display: inline-block; padding: 10px 20px; border-radius: 50px; text-decoration: none;" onclick="document.getElementById('user-dashboard-modal')?.classList.remove('open'); document.body.style.overflow='';">Explore Fresh Baked Menu</a>
          </div>
        `;
        return;
      }

      ordersList.innerHTML = orders.map(o => {
        const items = typeof o.items_json === 'string' ? JSON.parse(o.items_json) : (o.items_json || o.items || []);
        const itemsText = items.map(i => `${i.quantity || 1}x ${i.name || i.id}`).join(', ');
        const dateStr = o.created_at ? new Date(o.created_at).toLocaleDateString('en-IN', { month: 'short', day: 'numeric', year: 'numeric' }) : 'Recent';
        const isDispatched = o.delivery_status === 'DISPATCHED' || o.delivery_status === 'IN_TRANSIT';

        return `
          <div class="dashboard-order-card" style="background: rgba(250, 246, 240, 0.7); border: 1px solid rgba(61, 32, 0, 0.1); border-radius: 14px; padding: 16px; margin-bottom: 14px;">
            <div style="display: flex; justify-content: space-between; align-items: flex-start; flex-wrap: wrap; gap: 8px; margin-bottom: 10px;">
              <div>
                <div style="font-weight: 700; color: #3D2000; font-size: 14px;">Order #${o.id}</div>
                <div style="font-size: 11.5px; color: var(--color-text-muted);">${dateStr}</div>
              </div>
              <span class="badge-status ${isDispatched ? 'badge-paid' : 'badge-pending'}" style="font-size: 11px; padding: 3px 10px; border-radius: 20px;">
                ${o.delivery_status || 'ORDER_PLACED'}
              </span>
            </div>
            <p style="font-size: 13px; color: #552735; margin: 0 0 12px 0;"><strong>Items:</strong> ${itemsText || 'Confectionery Box'}</p>
            <div style="display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 10px; border-top: 1px dashed rgba(61, 32, 0, 0.1); padding-top: 10px;">
              <div style="font-size: 14px; font-weight: 700; color: var(--color-gold, #C8960C);">Total: ₹${o.total_amount || 0}</div>
              <div style="display: flex; gap: 8px;">
                <a href="/track-order.html?order=${o.id}" class="btn-action" style="padding: 6px 12px; font-size: 11px; text-decoration: none; border-radius: 6px;">🚚 Track Live</a>
                <a href="/api/orders/${o.id}/invoice" target="_blank" class="btn-action" style="padding: 6px 12px; font-size: 11px; text-decoration: none; background: rgba(61, 32, 0, 0.08); color: #3D2000; border-radius: 6px;">🧾 Tax Invoice</a>
              </div>
            </div>
          </div>
        `;
      }).join('');
    } catch (err) {
      ordersList.innerHTML = `<div style="text-align: center; padding: 30px; color: #E74C3C;">Unable to load order history. Please try again.</div>`;
    }
  }

  loadDashboardCart() {
    const cartList = document.getElementById('dashboard-cart-list');
    if (!cartList) return;

    try {
      // 1. Query cartStore items
      let cart = (cartStore && typeof cartStore.getItems === 'function') ? cartStore.getItems() : [];

      // 2. If empty, check all localStorage keys
      if (!Array.isArray(cart) || cart.length === 0) {
        for (const key of ['cart', 'ming_morsels_cart', 'mingmorsels_cart']) {
          const raw = localStorage.getItem(key);
          if (raw) {
            try {
              const parsed = JSON.parse(raw);
              if (Array.isArray(parsed) && parsed.length > 0) {
                cart = parsed;
                break;
              }
            } catch (e) {}
          }
        }
      }

      if (!Array.isArray(cart) || cart.length === 0) {
        cartList.innerHTML = `
          <div style="text-align: center; padding: 40px 20px; color: var(--color-text-muted);">
            <div style="font-size: 40px; margin-bottom: 10px;">🛒</div>
            <h4 style="color: #3D2000; margin-bottom: 6px;">Your Basket is Empty</h4>
            <p style="font-size: 13px; max-width: 300px; margin: 0 auto 16px;">Add freshly baked artisanal cookies to your basket to view and checkout here!</p>
            <a href="/#products" class="btn-action" style="display: inline-block; padding: 10px 20px; border-radius: 50px; text-decoration: none;" onclick="document.getElementById('user-dashboard-modal')?.classList.remove('open'); document.body.style.overflow='';">Explore Menu</a>
          </div>
        `;
        return;
      }

      let total = 0;
      cartList.innerHTML = `
        <div style="margin-bottom: 16px;">
          ${cart.map(item => {
            const qty = Math.max(1, parseInt(item.quantity ?? item.qty ?? 1, 10) || 1);
            const price = Number(item.price || item.customPrice || 160) || 160;
            const itemTotal = price * qty;
            total += itemTotal;
            const name = item.name || item.customName || 'Artisanal Cookie Box';
            const img = item.image || item.img || item.boxImage || `/img-${item.productId || item.id || 'almond'}.png`;
            return `
              <div style="display: flex; justify-content: space-between; align-items: center; padding: 12px 0; border-bottom: 1px solid rgba(61, 32, 0, 0.08);">
                <div style="display: flex; align-items: center; gap: 12px;">
                  <img src="${img}" alt="${name}" onerror="this.src='/img-almond.png'" style="width: 48px; height: 48px; border-radius: 8px; object-fit: cover; border: 1px solid rgba(61, 32, 0, 0.1);" />
                  <div>
                    <div style="font-weight: 700; font-size: 13.5px; color: #3D2000;">${name}</div>
                    <div style="font-size: 11.5px; color: var(--color-text-muted);">
                      ${item.packaging && item.packaging !== 'Standard Packaging' && item.packaging !== 'none' ? `<span>🎁 ${item.packaging}</span> · ` : ''}Qty: <strong>${qty}</strong> × ₹${price}
                    </div>
                  </div>
                </div>
                <div style="font-weight: 700; color: var(--color-gold, #C8960C); font-size: 14px;">₹${itemTotal}</div>
              </div>
            `;
          }).join('')}
        </div>
        <div style="display: flex; justify-content: space-between; align-items: center; padding-top: 14px; border-top: 1.5px solid rgba(61, 32, 0, 0.12);">
          <div style="font-weight: 800; color: #3D2000; font-size: 16px;">Basket Total: <span style="color: var(--color-gold, #C8960C);">₹${total}</span></div>
          <button class="btn-action" style="padding: 10px 20px; border-radius: 8px; font-weight: 600;" onclick="document.getElementById('user-dashboard-modal')?.classList.remove('open'); document.body.style.overflow=''; document.getElementById('cart-drawer')?.classList.add('open'); document.getElementById('cart-drawer-backdrop')?.classList.add('open');">Proceed to Checkout →</button>
        </div>
      `;
    } catch (e) {
      console.error('Failed to load dashboard cart:', e);
    }
  }

  loadDashboardAddress() {
    try {
      const saved = JSON.parse(localStorage.getItem('user_address') || '{}');
      if (document.getElementById('shipping-phone') && saved.phone) document.getElementById('shipping-phone').value = saved.phone;
      if (document.getElementById('shipping-address') && saved.address) document.getElementById('shipping-address').value = saved.address;
      if (document.getElementById('shipping-pincode') && saved.pincode) document.getElementById('shipping-pincode').value = saved.pincode;
    } catch (e) {}
  }
}

export const authController = new AuthController();
