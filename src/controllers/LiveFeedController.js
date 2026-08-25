// ─────────────────────────────────────────────────────────────────────────────
// LiveFeedController.js - Server-Sent Events (SSE) Live Feed & Purchase Toasts
// ─────────────────────────────────────────────────────────────────────────────

import { eventBus, Events } from './EventBus.js';

export class LiveFeedController {
  constructor() {
    this.eventSource = null;
    this.popupEl = null;
    this.profileIdx = 0;
    this.prodIdx = 0;

    this.customerProfiles = [
      { name: "Sourav H.M.", location: "Bengaluru, KA" },
      { name: "Ananya R.", location: "Indiranagar, BLR" },
      { name: "Rohan M.", location: "Koramangala, BLR" },
      { name: "Priya S.", location: "Whitefield, BLR" },
      { name: "Vikram K.", location: "Mumbai, MH" },
      { name: "Meera D.", location: "New Delhi, DL" },
      { name: "Aditya N.", location: "HSR Layout, BLR" },
      { name: "Sneha P.", location: "Jayanagar, BLR" },
      { name: "Tarun V.", location: "Hyderabad, TS" },
      { name: "Kavya B.", location: "Chennai, TN" }
    ];

    this.products = [
      { name: "Rose Petal Cookies", img: "/rose_cookie.png" },
      { name: "Almond Cookies", img: "/almond_cookie.png" },
      { name: "Walnut Cookies", img: "/sugarfree_walnut_cookie.png" },
      { name: "Sugar-Free Walnut Cookies", img: "/sugarfree_walnut_cookie.png" },
      { name: "Strawberry Muffins", img: "/strawberry_muffin.png" },
      { name: "Orange Peel Cookies", img: "/almond_cookie.png" },
      { name: "Chocochip Muffins", img: "/img-chocochip.jpg" },
      { name: "Oats Nuts Cookies", img: "/oatsnuts_cookie.png" },
      { name: "Butterscotch Muffins", img: "/butterscotch_muffin.png" },
      { name: "Pinacolada Muffins", img: "/img-pinacolada.jpg" }
    ];

    this.timesAgo = ["Just now", "2m ago", "5m ago", "12m ago", "18m ago", "34m ago", "42m ago", "1h ago"];
  }

  init() {
    this.buildPopupDOM();
    this.startSimulationInterval();
    this.connectLiveSSE();
  }

  buildPopupDOM() {
    this.popupEl = document.querySelector('.live-purchase-popup');
    if (!this.popupEl) {
      this.popupEl = document.createElement('div');
      this.popupEl.className = 'live-purchase-popup';
      this.popupEl.innerHTML = `
        <div class="live-purchase-accent"></div>
        <div class="live-purchase-img-wrap">
          <img id="live-purchase-img" src="/rose_cookie.png" alt="Product" />
        </div>
        <div class="live-purchase-content">
          <div class="live-purchase-header">
            <span id="live-purchase-name">Sourav</span>
            <span id="live-purchase-loc" class="live-purchase-loc">from Mysuru, KA</span>
          </div>
          <div class="live-purchase-text">
            just bought <strong id="live-purchase-item">Rose Petal Cookies</strong>
          </div>
          <div class="live-purchase-time">
            <span class="live-purchase-dot"></span> <span id="live-purchase-time-text">Verified Purchase · 2m ago</span>
          </div>
        </div>
        <button id="live-purchase-close" class="live-purchase-close" aria-label="Close">&times;</button>
      `;
      document.body.appendChild(this.popupEl);

      document.getElementById('live-purchase-close')?.addEventListener('click', () => {
        this.popupEl.classList.remove('show');
      });
    }
  }

  triggerPopup(customData = null) {
    if (!this.popupEl) return;

    const profile = customData?.profile || this.customerProfiles[this.profileIdx % this.customerProfiles.length];
    const prod = customData?.product || this.products[this.prodIdx % this.products.length];
    const timeAgo = customData?.timeAgo || this.timesAgo[Math.floor(Math.random() * this.timesAgo.length)];

    this.profileIdx++;
    this.prodIdx++;

    const nameEl = document.getElementById('live-purchase-name');
    const locEl = document.getElementById('live-purchase-loc');
    const itemEl = document.getElementById('live-purchase-item');
    const imgEl = document.getElementById('live-purchase-img');
    const timeEl = document.getElementById('live-purchase-time-text');

    if (nameEl) nameEl.textContent = profile.name;
    if (locEl) locEl.textContent = `from ${profile.location}`;
    if (itemEl) itemEl.textContent = prod.name;
    if (imgEl) imgEl.src = prod.img;
    if (timeEl) timeEl.textContent = `Verified Purchase · ${timeAgo}`;

    this.popupEl.classList.add('show');

    setTimeout(() => {
      this.popupEl.classList.remove('show');
    }, 7000);
  }

  startSimulationInterval() {
    setTimeout(() => this.triggerPopup(), 5000);
    setInterval(() => this.triggerPopup(), 3 * 60 * 1000);
  }

  connectLiveSSE() {
    if (typeof EventSource === 'undefined') return;

    try {
      this.eventSource = new EventSource('/api/events/live');
      this.eventSource.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          if (data.type === 'NEW_ORDER') {
            const firstItem = data.order?.items?.[0] || { name: 'Artisanal Cookies', image: '/img-rose.png' };
            this.triggerPopup({
              profile: { name: data.order?.user_name || 'Connoisseur', location: 'Bengaluru, KA' },
              product: { name: firstItem.name, img: firstItem.image || '/img-rose.png' },
              timeAgo: 'Just now'
            });
            eventBus.emit(Events.ORDER_LIVE_UPDATE, data.order);
          }
        } catch (err) {}
      };
    } catch (e) {}
  }
}

export const liveFeedController = new LiveFeedController();
