// ─────────────────────────────────────────────────────────────────────────────
// LiveFeedController.js - Server-Sent Events (SSE) Live Feed & Purchase Toasts
// ─────────────────────────────────────────────────────────────────────────────

import { eventBus, Events } from './EventBus.js';

export class LiveFeedController {
  constructor() {
    this.eventSource = null;
    this.popupEl = null;
    this.lastProfileIdx = -1;
    this.lastProdIdx = -1;
    this.timerId = null;

    this.customerProfiles = [
      { name: "Ananya R.", location: "Indiranagar, BLR" },
      { name: "Rohan M.", location: "Koramangala, BLR" },
      { name: "Pooja S.", location: "Whitefield, BLR" },
      { name: "Vikram K.", location: "Bandra, Mumbai" },
      { name: "Meera D.", location: "Vasant Kunj, Delhi" },
      { name: "Aditya N.", location: "HSR Layout, BLR" },
      { name: "Sneha P.", location: "Jayanagar, BLR" },
      { name: "Tarun V.", location: "Banjara Hills, HYD" },
      { name: "Kavya B.", location: "Anna Nagar, Chennai" },
      { name: "Siddharth J.", location: "Sadashivanagar, BLR" },
      { name: "Deepika S.", location: "Salt Lake, Kolkata" },
      { name: "Arjun M.", location: "Gokulam, Mysuru" },
      { name: "Neha K.", location: "Koregaon Park, Pune" },
      { name: "Rahul B.", location: "JP Nagar, BLR" },
      { name: "Priya V.", location: "Malleshwaram, BLR" },
      { name: "Nikhil T.", location: "Bellandur, BLR" },
      { name: "Shreya G.", location: "Jubilee Hills, HYD" },
      { name: "Gaurav S.", location: "Powai, Mumbai" }
    ];

    this.products = [
      { name: "Rose Petal Cookie", img: "/rose-petal/1.webp" },
      { name: "Almond Rich Cookie", img: "/almond/1.webp" },
      { name: "Walnut Cookies", img: "/sugarfree_walnut_cookie.webp" },
      { name: "Sugarfree Walnut Cookies", img: "/sugarfree_walnut_cookie.webp" },
      { name: "Strawberry Muffin", img: "/strawberry_muffin.webp" },
      { name: "Orange Peel Cookie", img: "/orange-peel/1.webp" },
      { name: "Chocochip Muffin", img: "/img-chocochip.webp?v=4" },
      { name: "Oats Nuts Cookie", img: "/oats-nuts/1.webp" },
      { name: "Butterscotch Muffin", img: "/img-butterscotch.webp" },
      { name: "Pinacolada Muffin", img: "/img-pinacolada.webp" },
      { name: "Blackcurrant Muffin", img: "/img-blackcurrant.webp" }
    ];

    this.timesAgo = ["Just now", "2m ago", "5m ago", "12m ago", "18m ago", "34m ago", "42m ago", "1h ago"];
  }

  init() {
    this.buildPopupDOM();
    this.scheduleNextPopup(Math.floor(Math.random() * 4000) + 4000); // 4-8s initial delay
    if (typeof window !== 'undefined') {
      if (document.readyState === 'complete') {
        setTimeout(() => this.connectLiveSSE(), 2500);
      } else {
        window.addEventListener('load', () => setTimeout(() => this.connectLiveSSE(), 2500), { once: true });
      }
    }
  }

  buildPopupDOM() {
    this.popupEl = document.querySelector('.live-purchase-popup');
    if (!this.popupEl) {
      this.popupEl = document.createElement('div');
      this.popupEl.className = 'live-purchase-popup';
      this.popupEl.innerHTML = `
        <div class="live-purchase-accent"></div>
        <div class="live-purchase-img-wrap">
          <img id="live-purchase-img" src="/rose-petal/1.webp" alt="Product" />
        </div>
        <div class="live-purchase-content">
          <div class="live-purchase-header">
            <span id="live-purchase-name">Customer</span>
            <span id="live-purchase-loc" class="live-purchase-loc">from Bengaluru</span>
          </div>
          <div class="live-purchase-text">
            just bought <strong id="live-purchase-item">Rose Petal Cookie</strong>
          </div>
          <div class="live-purchase-time">
            <span class="live-purchase-dot"></span> <span id="live-purchase-time-text">Verified Purchase · Just now</span>
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

  getRandomProfile() {
    let idx = Math.floor(Math.random() * this.customerProfiles.length);
    if (idx === this.lastProfileIdx && this.customerProfiles.length > 1) {
      idx = (idx + 1) % this.customerProfiles.length;
    }
    this.lastProfileIdx = idx;
    return this.customerProfiles[idx];
  }

  getRandomProduct() {
    let idx = Math.floor(Math.random() * this.products.length);
    if (idx === this.lastProdIdx && this.products.length > 1) {
      idx = (idx + 1) % this.products.length;
    }
    this.lastProdIdx = idx;
    return this.products[idx];
  }

  triggerPopup(customData = null) {
    if (!this.popupEl) return;

    const profile = customData?.profile || this.getRandomProfile();
    const prod = customData?.product || this.getRandomProduct();
    const timeAgo = customData?.timeAgo || this.timesAgo[Math.floor(Math.random() * this.timesAgo.length)];

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
    }, 6500);
  }

  scheduleNextPopup(delayMs) {
    if (this.timerId) clearTimeout(this.timerId);
    this.timerId = setTimeout(() => {
      this.triggerPopup();
      // Next popup after 45s - 85s
      const nextDelay = Math.floor(Math.random() * 40000) + 45000;
      this.scheduleNextPopup(nextDelay);
    }, delayMs);
  }

  connectLiveSSE() {
    if (typeof EventSource === 'undefined') return;

    try {
      this.eventSource = new EventSource('/api/events/live');
      this.eventSource.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          if (data.type === 'NEW_ORDER') {
            const firstItem = data.order?.items?.[0] || { name: 'Rose Petal Cookie', image: '/rose-petal/1.webp' };
            this.triggerPopup({
              profile: { name: data.order?.user_name || 'Connoisseur', location: 'Bengaluru, KA' },
              product: { name: firstItem.name, img: firstItem.image || '/rose-petal/1.webp' },
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

