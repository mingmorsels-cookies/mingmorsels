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
    // Delay notification permission prompt by 50 seconds after entering the website as requested
    setTimeout(() => this.showNotifPermissionModal(), 50000);
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

  async syncPushSubscription() {
    if (!('serviceWorker' in navigator) || !('PushManager' in window)) return;
    if (typeof Notification === 'undefined' || Notification.permission !== 'granted') return;

    try {
      const swReg = await navigator.serviceWorker.register('/sw.js');
      await navigator.serviceWorker.ready;

      let subscription = await swReg.pushManager.getSubscription();
      if (!subscription) {
        const res = await fetch('/api/push/public-key');
        if (res.ok) {
          const { publicKey } = await res.json();
          if (publicKey) {
            const urlBase64ToUint8Array = (base64String) => {
              const padding = '='.repeat((4 - base64String.length % 4) % 4);
              const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
              const rawData = window.atob(base64);
              return Uint8Array.from([...rawData].map(c => c.charCodeAt(0)));
            };
            subscription = await swReg.pushManager.subscribe({
              userVisibleOnly: true,
              applicationServerKey: urlBase64ToUint8Array(publicKey)
            });
          }
        }
      }

      if (subscription) {
        let user = {};
        try { user = JSON.parse(localStorage.getItem('user_profile') || '{}'); } catch(e) {}
        await fetch('/api/push/subscribe', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            subscription,
            customer_email: user.email || '',
            customer_phone: user.phone || localStorage.getItem('ming_morsels_phone') || ''
          })
        });
        console.log('🔔 [Push] Active subscriber registered with backend.');
      }
    } catch (err) {
      console.warn('Push sync note:', err.message);
    }
  }

  showNotifPermissionModal() {
    if (!('Notification' in window)) return;
    if (Notification.permission === 'granted') {
      this.syncPushSubscription();
      return;
    }
    if (Notification.permission === 'denied') return;

    let modal = document.getElementById('notif-permission-modal');
    if (!modal) {
      modal = document.createElement('div');
      modal.id = 'notif-permission-modal';
      modal.style.cssText = `
        position: fixed;
        inset: 0;
        background: rgba(18, 14, 11, 0.8);
        backdrop-filter: blur(8px);
        -webkit-backdrop-filter: blur(8px);
        z-index: 999999;
        display: flex;
        align-items: center;
        justify-content: center;
        padding: 20px;
        animation: fadeIn 0.3s ease;
      `;
      modal.innerHTML = `
        <div style="background: linear-gradient(145deg, #1e130c, #140b06); border: 1.5px solid #C8960C; border-radius: 20px; max-width: 440px; width: 100%; padding: 32px; text-align: center; box-shadow: 0 20px 60px rgba(0,0,0,0.8), 0 0 30px rgba(200,150,12,0.25); position: relative;">
          <div style="width: 64px; height: 64px; background: rgba(200,150,12,0.15); border: 1.5px solid #C8960C; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 30px; margin: 0 auto 18px auto;">
            🔔
          </div>
          <h3 style="font-family: 'Playfair Display', Georgia, serif; font-size: 22px; color: #FAF6F0; margin: 0 0 10px 0;">Enable Fresh Batch &amp; Order Alerts</h3>
          <p style="font-size: 13.5px; color: #D4C5B9; line-height: 1.55; margin: 0 0 24px 0;">
            Get instant updates when your artisanal cookies come fresh out of the oven, track live dispatch milestones, and receive VIP subscriber-only perks!
          </p>
          <div style="display: flex; gap: 12px; justify-content: center;">
            <button id="notif-later-btn" style="flex: 1; padding: 13px 18px; background: rgba(250,246,240,0.06); border: 1px solid rgba(250,246,240,0.2); border-radius: 12px; color: #D4C5B9; font-size: 13.5px; font-weight: 600; cursor: pointer; transition: all 0.2s;">
              Maybe Later
            </button>
            <button id="notif-allow-btn" style="flex: 1.3; padding: 13px 18px; background: linear-gradient(135deg, #C8960C, #E0AB18); border: none; border-radius: 12px; color: #120E0B; font-size: 14px; font-weight: 700; cursor: pointer; box-shadow: 0 4px 15px rgba(200,150,12,0.4); transition: all 0.2s;">
              Allow Alerts 🍪
            </button>
          </div>
        </div>
      `;
      document.body.appendChild(modal);
    }
    modal.style.display = 'flex';

    document.getElementById('notif-allow-btn').onclick = async () => {
      modal.style.display = 'none';
      try {
        const permission = await Notification.requestPermission();
        if (permission === 'granted') {
          localStorage.setItem('mm_notif_allowed', 'true');
          await this.syncPushSubscription();
        }
      } catch (err) {
        console.warn('Push subscription error:', err);
      }
    };

    document.getElementById('notif-later-btn').onclick = () => {
      modal.style.display = 'none';
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
        
        // Clear cart to prevent items persisting across different accounts
        if (cartStore && typeof cartStore.clear === 'function') {
          cartStore.clear();
        }

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
        const email = document.getElementById('shipping-email')?.value.trim() || '';
        const phone = document.getElementById('shipping-phone')?.value.trim() || '';
        const address = document.getElementById('shipping-address')?.value.trim() || '';
        const city = document.getElementById('shipping-city')?.value.trim() || 'Bengaluru';
        const pincode = document.getElementById('shipping-pincode')?.value.trim() || '';

        if (!email || !email.includes('@') || !email.includes('.')) {
          alert('Please enter a valid email address so order confirmations reach your inbox.');
          return;
        }

        localStorage.setItem('user_address', JSON.stringify({ email, phone, address, city, pincode }));
        localStorage.setItem('ming_morsels_email', email);
        if (phone) localStorage.setItem('ming_morsels_phone', phone);
        if (address) localStorage.setItem('ming_morsels_address', `${address}, Pincode: ${pincode}`);
        if (pincode) localStorage.setItem('ming_morsels_pincode', pincode);

        // Update user profile in local storage
        try {
          const userProfile = JSON.parse(localStorage.getItem('user_profile') || '{}');
          userProfile.email = email;
          if (phone) userProfile.phone = phone;
          if (address) userProfile.address = `${address}, Pincode: ${pincode}`;
          if (pincode) userProfile.pincode = pincode;
          localStorage.setItem('user_profile', JSON.stringify(userProfile));

          const dashEmail = document.getElementById('dashboard-user-email');
          if (dashEmail) dashEmail.textContent = email;
        } catch (err) {}

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
      const rewardsLabel = document.getElementById('rewards-progress-label');
      const paidOrders = orders.filter(o => o.payment_status === 'PAID' || !o.payment_status);
      const points = paidOrders.length * 100;
      if (rewardsCount) {
        rewardsCount.textContent = points >= 1000 ? `👑 ${points} Points` : `${points} Points`;
      }
      if (rewardsLabel) {
        rewardsLabel.textContent = points >= 1000 ? `You have reached VIP Connoisseur status!` : `${points} / 1000 points to VIP Connoisseur status!`;
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
      const user = this.userProfile || JSON.parse(localStorage.getItem('user_profile') || '{}');
      const email = saved.email || localStorage.getItem('ming_morsels_email') || user.email || '';
      
      if (document.getElementById('shipping-email') && email) {
        document.getElementById('shipping-email').value = email;
      }
      if (document.getElementById('shipping-phone') && (saved.phone || user.phone || localStorage.getItem('ming_morsels_phone'))) {
        document.getElementById('shipping-phone').value = saved.phone || user.phone || localStorage.getItem('ming_morsels_phone');
      }
      if (document.getElementById('shipping-address') && (saved.address || user.address || localStorage.getItem('ming_morsels_address'))) {
        document.getElementById('shipping-address').value = saved.address || user.address || localStorage.getItem('ming_morsels_address');
      }
      if (document.getElementById('shipping-pincode') && (saved.pincode || user.pincode || localStorage.getItem('ming_morsels_pincode'))) {
        document.getElementById('shipping-pincode').value = saved.pincode || user.pincode || localStorage.getItem('ming_morsels_pincode');
      }
    } catch (e) {}
  }
}

export const authController = new AuthController();
