// ─────────────────────────────────────────────────────────────────────────────
// Live Social Proof Notifications & Toast Controller
// ─────────────────────────────────────────────────────────────────────────────

const RECENT_PURCHASES = [
  { name: 'Priya S.', location: 'Indiranagar, Bengaluru', item: 'Royal Roasted Almond Box', time: '2 mins ago' },
  { name: 'Vikram M.', location: 'Koramangala, Bengaluru', item: 'Damascus Rose Petal Box', time: '4 mins ago' },
  { name: 'Ananya R.', location: 'Whitefield, Bengaluru', item: '70% Dark Belgian Lava Muffin', time: '6 mins ago' },
  { name: 'Rohan D.', location: 'HSR Layout, Bengaluru', item: 'Bespoke Connoisseur Box (6 Flavors)', time: '8 mins ago' },
  { name: 'Kavita N.', location: 'Jayanagar, Bengaluru', item: 'Sugar-Free Walnut Delight Box', time: '11 mins ago' }
];

export function initLivePurchaseNotifications() {
  const container = document.getElementById('live-purchase-container') || createToastContainer();
  if (!container) return;

  let currentIndex = 0;

  function showNextNotification() {
    if (document.hidden) return; // Skip if tab is in background

    const purchase = RECENT_PURCHASES[currentIndex % RECENT_PURCHASES.length];
    currentIndex++;

    const toast = document.createElement('div');
    toast.className = 'live-purchase-toast';
    toast.setAttribute('role', 'status');
    toast.setAttribute('aria-live', 'polite');
    toast.innerHTML = `
      <div class="live-purchase-avatar">✨</div>
      <div class="live-purchase-content">
        <p class="live-purchase-title"><strong>${purchase.name}</strong> from ${purchase.location}</p>
        <p class="live-purchase-desc">Purchased <em>${purchase.item}</em> • <span class="live-time">${purchase.time}</span></p>
      </div>
    `;

    container.appendChild(toast);

    // Animate in
    setTimeout(() => toast.classList.add('visible'), 50);

    // Animate out
    setTimeout(() => {
      toast.classList.remove('visible');
      setTimeout(() => toast.remove(), 400);
    }, 4500);
  }

  // Initial trigger after 4 seconds, then repeat every 18-25 seconds
  setTimeout(() => {
    showNextNotification();
    setInterval(showNextNotification, 20000);
  }, 4000);
}

function createToastContainer() {
  const div = document.createElement('div');
  div.id = 'live-purchase-container';
  div.className = 'live-purchase-container';
  document.body.appendChild(div);
  return div;
}

export function showToast(message, type = 'info') {
  const container = document.getElementById('live-purchase-container') || createToastContainer();
  const toast = document.createElement('div');
  toast.className = `live-purchase-toast toast-${type}`;
  toast.setAttribute('role', 'alert');
  toast.innerHTML = `
    <div class="live-purchase-avatar">${type === 'error' ? '⚠️' : '✨'}</div>
    <div class="live-purchase-content">
      <p class="live-purchase-desc" style="color: #3D2000; font-weight: 600;">${message}</p>
    </div>
  `;
  container.appendChild(toast);
  setTimeout(() => toast.classList.add('visible'), 50);
  setTimeout(() => {
    toast.classList.remove('visible');
    setTimeout(() => toast.remove(), 400);
  }, 3500);
}
