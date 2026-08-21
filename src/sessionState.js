/**
 * Session State Recovery & Network Offline Resilience Engine for mingmorsels
 * Automatically preserves and restores user journey across unexpected page reloads and network drops.
 */

const SESSION_KEY = 'ming_morsels_active_session';
const SESSION_MAX_AGE_MS = 30 * 60 * 1000; // 30 minutes expiration

export const SessionType = {
  CHECKOUT_PAYMENT: 'CHECKOUT_PAYMENT',
  SHIPPING_DETAILS: 'SHIPPING_DETAILS',
  CART_DRAWER: 'CART_DRAWER',
  GIFT_BOX_BUILDER: 'GIFT_BOX_BUILDER',
  PRODUCT_VIEW: 'PRODUCT_VIEW',
  SECTION_VIEW: 'SECTION_VIEW'
};

/**
 * Save current user activity state
 */
export function saveActiveSession(type, payload = {}) {
  try {
    const sessionData = {
      type,
      payload,
      timestamp: Date.now(),
      url: window.location.href,
      pathname: window.location.pathname,
      search: window.location.search,
      hash: window.location.hash,
      scrollY: window.scrollY || 0
    };
    localStorage.setItem(SESSION_KEY, JSON.stringify(sessionData));
  } catch (e) {
    console.warn('Session save error:', e);
  }
}

/**
 * Get saved session if valid and not expired
 */
export function getSavedSession() {
  try {
    const raw = localStorage.getItem(SESSION_KEY);
    if (!raw) return null;
    const session = JSON.parse(raw);
    if (!session || !session.timestamp) return null;
    
    // Check expiration
    if (Date.now() - session.timestamp > SESSION_MAX_AGE_MS) {
      clearActiveSession();
      return null;
    }
    return session;
  } catch (e) {
    return null;
  }
}

/**
 * Clear session upon successful checkout or completion
 */
export function clearActiveSession() {
  try {
    localStorage.removeItem(SESSION_KEY);
  } catch (e) { }
}

/**
 * Initialize Network Offline / Online Monitor Banner
 */
export function initNetworkMonitor() {
  if (document.getElementById('mm-network-status-banner')) return;

  const banner = document.createElement('div');
  banner.id = 'mm-network-status-banner';
  banner.className = 'mm-network-banner';
  banner.innerHTML = `
    <div class="mm-network-banner-content">
      <span id="mm-network-icon" class="mm-net-icon">⚠️</span>
      <span id="mm-network-msg" class="mm-net-msg">Network Connection Lost. Your cart &amp; progress are safe offline.</span>
      <button type="button" id="mm-net-dismiss-btn" class="mm-net-dismiss">✕</button>
    </div>
  `;
  document.body.appendChild(banner);

  const iconEl = document.getElementById('mm-network-icon');
  const msgEl = document.getElementById('mm-network-msg');
  const dismissBtn = document.getElementById('mm-net-dismiss-btn');

  dismissBtn?.addEventListener('click', () => {
    banner.classList.remove('show');
  });

  const showOffline = () => {
    if (iconEl) iconEl.textContent = '📡';
    if (msgEl) msgEl.textContent = 'Internet connection lost. Your cart and session are saved securely offline.';
    banner.className = 'mm-network-banner show offline';
  };

  const showOnline = () => {
    if (iconEl) iconEl.textContent = '✅';
    if (msgEl) msgEl.textContent = 'Back online! Reconnecting your session...';
    banner.className = 'mm-network-banner show online';
    setTimeout(() => {
      banner.classList.remove('show');
    }, 3500);
  };

  window.addEventListener('offline', showOffline);
  window.addEventListener('online', showOnline);

  // Check initial state
  if (!navigator.onLine) {
    showOffline();
  }
}

/**
 * Show a recovery toast banner with quick action
 */
export function showRecoveryBanner(message, actionLabel, onAction) {
  let toast = document.getElementById('mm-recovery-toast');
  if (!toast) {
    toast = document.createElement('div');
    toast.id = 'mm-recovery-toast';
    toast.className = 'mm-recovery-toast';
    document.body.appendChild(toast);
  }

  toast.innerHTML = `
    <div class="mm-recovery-toast-inner">
      <span class="mm-recovery-icon">🔄</span>
      <div class="mm-recovery-text">
        <strong>Session Restored</strong>
        <p>${message}</p>
      </div>
      <div class="mm-recovery-actions">
        ${actionLabel ? `<button type="button" id="btn-mm-recovery-action" class="btn-recovery-action">${actionLabel}</button>` : ''}
        <button type="button" id="btn-mm-recovery-close" class="btn-recovery-close" title="Dismiss">✕</button>
      </div>
    </div>
  `;

  toast.classList.add('show');

  document.getElementById('btn-mm-recovery-close')?.addEventListener('click', () => {
    toast.classList.remove('show');
    clearActiveSession();
  });

  if (actionLabel && onAction) {
    document.getElementById('btn-mm-recovery-action')?.addEventListener('click', () => {
      toast.classList.remove('show');
      onAction();
    });
  }

  // Auto-dismiss after 6s if user takes no action
  setTimeout(() => {
    if (toast.classList.contains('show')) {
      toast.classList.remove('show');
      clearActiveSession();
    }
  }, 6000);
}
