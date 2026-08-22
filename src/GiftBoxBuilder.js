// Gift Box Builder Module
import './GiftBoxBuilder.css';

const AVAILABLE_ITEMS = [
  { id: 'almond', name: 'Almond Cookie', img: '/img-almond.png?v=2', price: 160, type: 'cookie' },
  { id: 'rose', name: 'Rose Petal Cookie', img: '/img-rose.png?v=2', price: 150, type: 'cookie' },
  { id: 'oatsnuts', name: 'Oats & Nuts Cookie', img: '/img-oats.png?v=2', price: 135, type: 'cookie' },
  { id: 'orange', name: 'Orange Peel Cookie', img: '/img-orange.png?v=2', price: 160, type: 'cookie' },
  { id: 'walnut', name: 'Walnut Cookie', img: '/img-walnut.png?v=2', price: 210, type: 'cookie' },
  { id: 'walnut_sf', name: 'Sugar-Free Walnut Cookie', img: '/img-walnut-sf.png?v=2', price: 220, type: 'cookie' },
  { id: 'strawberry', name: 'Strawberry Muffin', img: '/img-strawberry.png?v=2', price: 160, type: 'muffin' },
  { id: 'pineapple', name: 'Pineapple Muffin', img: '/img-pineapple.png?v=2', price: 155, type: 'muffin' },
  { id: 'butterscotch', name: 'Butterscotch Muffin', img: '/img-butterscotch.png?v=2', price: 165, type: 'muffin' },
  { id: 'choco', name: 'Choco Fudge Muffin', img: '/img-choco.png?v=2', price: 170, type: 'muffin' }
];

const BOX_OPTIONS = {
  classic: {
    id: 'classic',
    name: 'Signature Treat Box',
    img: '/box-classic.jpg',
    extraPrice: 15,
    maxSlots: 10,
    allowsMuffins: true,
    capacityText: 'Holds up to 10 Cookies & Muffins',
    fullDesc: 'Artisanal gable handle box in signature orange & cream design with secure easy-carry fold. Holds up to 10 fresh bakery treats.'
  },
  lush: {
    id: 'lush',
    name: 'Lush Luxury Box',
    img: '/box-lush.jpg',
    extraPrice: 130,
    maxSlots: 4,
    hasDryFruits: true,
    allowsMuffins: false,
    capacityText: 'Holds 4 Cookies + Premium Dry Fruits',
    fullDesc: 'Exquisite blush floral keepsake gift box with gold-foil accents. Fits 4 artisanal cookies and includes a gourmet pouch of California roasted dry fruits.'
  }
};

let currentBoxType = 'classic';
let selectedSlots = [];
let onBoxAddedCallback = null;

export function initGiftBoxBuilder(onAddToCart) {
  onBoxAddedCallback = onAddToCart;
  injectModalHTML();
  bindEvents();
}

function injectModalHTML() {
  if (document.getElementById('box-builder-modal')) return;

  const modalHTML = `
    <div id="box-builder-modal" class="box-builder-modal">
      <div class="box-builder-card">
        <button id="btn-close-box-modal" class="btn-close-modal" aria-label="Close modal">×</button>
        <div class="box-builder-header">
          <h2 class="box-builder-title">🎁 Custom Bakery Gift Box</h2>
          <p class="box-builder-subtitle">Choose your box style and curate your personalized luxury treat collection.</p>
        </div>

        <!-- 2 Visual Box Options -->
        <div class="box-type-cards-selector">
          <div class="box-type-card active" data-box-type="classic" id="box-card-classic">
            <div class="box-type-img-wrapper" data-box="classic">
              <img src="/box-classic.jpg" alt="Signature Treat Box" class="box-type-img" />
              <button type="button" class="btn-view-full-box" data-preview-box="classic" title="Click to see full box photo">🔍 View Full Box</button>
            </div>
            <span class="box-type-title">Signature Treat Box</span>
            <span class="box-type-price">+₹15 packaging</span>
            <span class="box-type-capacity">Fits up to 10 Cookies &amp; Muffins</span>
          </div>

          <div class="box-type-card" data-box-type="lush" id="box-card-lush">
            <div class="box-type-img-wrapper" data-box="lush">
              <img src="/box-lush.jpg" alt="Lush Luxury Box" class="box-type-img" />
              <button type="button" class="btn-view-full-box" data-preview-box="lush" title="Click to see full box photo">🔍 View Full Box</button>
            </div>
            <span class="box-type-title">Lush Luxury Box</span>
            <span class="box-type-price">+₹130 luxury packaging</span>
            <span class="box-type-capacity">Fits up to 4 Cookies + Premium Dry Fruits</span>
          </div>
        </div>

        <div id="box-builder-warning-container"></div>

        <div class="box-builder-layout">
          <!-- Visual Box Preview -->
          <div class="box-visual-preview">
            <h3 class="picker-title"><span id="box-name-display">Signature Treat Box</span> (<span id="slots-count">0</span>/<span id="slots-max">10</span>)</h3>
            <div id="box-grid-slots" class="box-grid-slots"></div>
            <div id="lush-dry-fruits-slot" style="display: none; margin-top: 12px; padding: 10px; background: rgba(198, 150, 12, 0.12); border: 1px dashed #C6960C; border-radius: 12px; font-size: 12px; color: #3D2000; font-weight: 600;">
              ✨ Premium Roasted Dry Fruits Pouch Included
            </div>
          </div>

          <!-- Picker & Message Side -->
          <div class="box-options-side">
            <h3 class="picker-title">Select Flavours to Add</h3>
            <div class="item-picker-grid">
              ${AVAILABLE_ITEMS.map(item => `
                <div class="picker-item-card" data-item-id="${item.id}" data-type="${item.type}">
                  <img src="${item.img}" alt="${item.name}" class="picker-item-img" />
                  <div>
                    <span class="picker-item-name">+ ${item.name}</span>
                    <span style="display: block; font-size: 10px; color: #888;">₹${item.price} • ${item.type === 'muffin' ? 'Muffin' : 'Cookie'}</span>
                  </div>
                </div>
              `).join('')}
            </div>

            <div>
              <h3 class="picker-title" style="margin-bottom: 8px;">Personalized Gift Message</h3>
              <textarea id="box-greeting-message" class="card-message-input" rows="2" placeholder="Write your gift message for the recipient ribbon card..."></textarea>
            </div>

            <button id="btn-add-box-to-cart" class="btn-add-box-cart">Add Custom Box to Order • ₹<span id="box-total-price">15</span></button>
          </div>
        </div>
      </div>
    </div>

    <!-- Full Image Lightbox Modal -->
    <div id="box-image-lightbox-modal" class="box-lightbox-modal">
      <div class="box-lightbox-content">
        <button id="btn-close-box-lightbox" class="btn-close-lightbox" aria-label="Close photo view">✕</button>
        <div class="lightbox-img-container">
          <img id="lightbox-box-img" src="" alt="Gift Box Full View" class="lightbox-full-img" />
        </div>
        <h3 id="lightbox-box-title" class="lightbox-title">Gift Box Photo</h3>
        <p id="lightbox-box-desc" class="lightbox-details"></p>
      </div>
    </div>
  `;

  document.body.insertAdjacentHTML('beforeend', modalHTML);
  renderSlots();
  updatePickerVisibility();
}

function updatePickerVisibility() {
  document.querySelectorAll('.picker-item-card').forEach(card => {
    const itemType = card.getAttribute('data-type');
    if (currentBoxType === 'lush') {
      if (itemType === 'muffin') {
        card.style.display = 'none';
      } else {
        card.style.display = 'flex';
      }
    } else {
      card.style.display = 'flex';
    }
  });
}

export function openBoxImageLightbox(boxKey) {
  const def = BOX_OPTIONS[boxKey] || BOX_OPTIONS.classic;
  const modal = document.getElementById('box-image-lightbox-modal');
  const img = document.getElementById('lightbox-box-img');
  const title = document.getElementById('lightbox-box-title');
  const desc = document.getElementById('lightbox-box-desc');

  if (!modal || !img) return;

  img.src = def.img;
  img.alt = def.name;
  if (title) title.textContent = `${def.name} (+₹${def.extraPrice})`;
  if (desc) desc.textContent = `${def.fullDesc} (${def.capacityText})`;

  modal.classList.add('open');
}

export function closeBoxImageLightbox() {
  const modal = document.getElementById('box-image-lightbox-modal');
  if (modal) modal.classList.remove('open');
}

function showWarning(msg) {
  const container = document.getElementById('box-builder-warning-container');
  if (!container) return;
  container.innerHTML = `
    <div class="box-warning-banner">
      <span>⚠️</span>
      <span>${msg}</span>
    </div>
  `;
  setTimeout(() => {
    if (container.innerHTML.includes(msg)) {
      container.innerHTML = '';
    }
  }, 4000);
}

function bindEvents() {
  const closeBtn = document.getElementById('btn-close-box-modal');
  const addCartBtn = document.getElementById('btn-add-box-to-cart');

  closeBtn?.addEventListener('click', () => hideBoxBuilder());

  // Lightbox Close Events
  document.getElementById('btn-close-box-lightbox')?.addEventListener('click', closeBoxImageLightbox);
  const lightboxModal = document.getElementById('box-image-lightbox-modal');
  lightboxModal?.addEventListener('click', (e) => {
    if (e.target === lightboxModal) closeBoxImageLightbox();
  });
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') closeBoxImageLightbox();
  });

  // Preview Full Box Image button clicks
  document.querySelectorAll('[data-preview-box]').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      const boxKey = btn.getAttribute('data-preview-box');
      openBoxImageLightbox(boxKey);
    });
  });

  // Box Type Selector Cards
  document.querySelectorAll('.box-type-card').forEach(card => {
    card.addEventListener('click', (e) => {
      // Don't select if clicking view full box button
      if (e.target.closest('[data-preview-box]')) return;

      const type = card.getAttribute('data-box-type');
      if (type === currentBoxType) return;

      // If switching to Lush, remove any muffins that were previously selected
      if (type === 'lush') {
        const hadMuffins = selectedSlots.some(s => s.type === 'muffin');
        if (hadMuffins) {
          selectedSlots = selectedSlots.filter(s => s.type !== 'muffin');
          showWarning("Muffins were removed because they cannot fit into the Lush box.");
        }
      }

      document.querySelectorAll('.box-type-card').forEach(c => c.classList.remove('active'));
      card.classList.add('active');
      currentBoxType = type;

      const maxSlots = BOX_OPTIONS[currentBoxType].maxSlots;
      if (selectedSlots.length > maxSlots) {
        selectedSlots = selectedSlots.slice(0, maxSlots);
      }

      updatePickerVisibility();
      renderSlots();
    });
  });

  // Treat Item Picker
  document.querySelectorAll('.picker-item-card').forEach(card => {
    card.addEventListener('click', () => {
      const itemId = card.getAttribute('data-item-id');
      const foundItem = AVAILABLE_ITEMS.find(i => i.id === itemId);
      if (!foundItem) return;

      // Check if user is trying to add a muffin to the Lush box
      if (currentBoxType === 'lush' && foundItem.type === 'muffin') {
        showWarning("Muffins can't fit in this box, select another box.");
        return;
      }

      const maxSlots = BOX_OPTIONS[currentBoxType].maxSlots;
      if (selectedSlots.length >= maxSlots) {
        showWarning(`This ${BOX_OPTIONS[currentBoxType].name} holds up to ${maxSlots} treats!`);
        return;
      }

      selectedSlots.push(foundItem);
      renderSlots();
    });
  });

  addCartBtn?.addEventListener('click', () => {
    if (selectedSlots.length === 0) {
      alert("Please add at least one treat to your gift box!");
      return;
    }

    const boxDef = BOX_OPTIONS[currentBoxType];
    const greetingMsg = document.getElementById('box-greeting-message')?.value || "";
    const itemsPrice = selectedSlots.reduce((acc, curr) => acc + curr.price, 0);
    const totalPrice = itemsPrice + boxDef.extraPrice;

    const customBoxItem = {
      id: `custom_box_${Date.now()}`,
      name: `${boxDef.name} (${selectedSlots.length} items${boxDef.hasDryFruits ? ' + Dry Fruits' : ''})`,
      price: totalPrice,
      qty: 1,
      image: boxDef.img,
      packaging: boxDef.name,
      boxExtraPrice: boxDef.extraPrice,
      details: selectedSlots.map(s => s.name).join(', ') + (boxDef.hasDryFruits ? ' + Premium Dry Fruits Pouch' : ''),
      note: greetingMsg
    };

    if (onBoxAddedCallback) {
      onBoxAddedCallback(customBoxItem);
    }

    hideBoxBuilder();
    selectedSlots = [];
    renderSlots();
  });
}

function renderSlots() {
  const grid = document.getElementById('box-grid-slots');
  const countSpan = document.getElementById('slots-count');
  const maxSpan = document.getElementById('slots-max');
  const nameDisplay = document.getElementById('box-name-display');
  const priceSpan = document.getElementById('box-total-price');
  const dryFruitsSlot = document.getElementById('lush-dry-fruits-slot');

  if (!grid) return;

  const boxDef = BOX_OPTIONS[currentBoxType];
  const maxSlots = boxDef.maxSlots;

  if (nameDisplay) nameDisplay.innerText = boxDef.name;
  if (maxSpan) maxSpan.innerText = maxSlots;
  if (dryFruitsSlot) dryFruitsSlot.style.display = boxDef.hasDryFruits ? 'block' : 'none';

  grid.innerHTML = '';
  for (let i = 0; i < maxSlots; i++) {
    const item = selectedSlots[i];
    const slotDiv = document.createElement('div');
    slotDiv.className = `box-slot ${item ? 'filled' : ''}`;

    if (item) {
      slotDiv.innerHTML = `
        <button class="btn-remove-slot" data-index="${i}">×</button>
        <img src="${item.img}" alt="${item.name}" class="slot-img" />
        <span class="slot-title">${item.name}</span>
      `;
    } else {
      slotDiv.innerHTML = `<span style="color: #A58B73; font-size: 11px;">+ Empty Slot</span>`;
    }

    grid.appendChild(slotDiv);
  }

  grid.querySelectorAll('.btn-remove-slot').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const idx = parseInt(e.target.getAttribute('data-index'));
      selectedSlots.splice(idx, 1);
      renderSlots();
    });
  });

  if (countSpan) countSpan.innerText = selectedSlots.length;
  if (priceSpan) {
    const itemsPrice = selectedSlots.reduce((acc, curr) => acc + curr.price, 0);
    priceSpan.innerText = itemsPrice + boxDef.extraPrice;
  }
}

export function showBoxBuilder() {
  const modal = document.getElementById('box-builder-modal');
  if (modal) modal.classList.add('open');
}

export function hideBoxBuilder() {
  const modal = document.getElementById('box-builder-modal');
  if (modal) modal.classList.remove('open');
}


