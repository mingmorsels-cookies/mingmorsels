// ─────────────────────────────────────────────────────────────────────────────
// QuickAddModal.js - Luxury 3-Card Box Selector Popup with Visual Box Images
// ─────────────────────────────────────────────────────────────────────────────

import { cartStore } from '../services/CartStore.js';
import { eventBus, Events } from './EventBus.js';

export const PRODUCT_BOX_CATALOG = {
  almond: {
    id: 'almond',
    name: 'Almond Rich Cookies',
    tagline: 'Whole roasted California almonds & raw organic honey',
    image: '/img-almond.png',
    unitName: 'Cookies',
    boxes: [
      {
        id: 'almond_snack_2pcs',
        name: 'Snack Pack',
        countLabel: 'Up to 2 Cookies',
        price: 40,
        desc: '2 Freshly baked whole-almond cookies.',
        img: '/almond-box-2pcs.png'
      },
      {
        id: 'almond_classic_8pcs',
        name: 'Classic Box',
        countLabel: 'Up to 8 Cookies',
        price: 160,
        desc: '8 Artisanal cookies in signature gold box.',
        img: '/almond-box-8pcs.jpg',
        popular: true
      },
      {
        id: 'almond_family_12pcs',
        name: 'Family Pack',
        countLabel: 'Up to 12 Cookies',
        price: 360,
        desc: '12 Generous pieces in keepsake collection box.',
        img: '/almond-box-12pcs.png'
      }
    ]
  },
  rose: {
    id: 'rose',
    name: 'Rose Petal Cookies',
    tagline: 'Organic Damask rose petals with pure cow butter',
    image: '/img-rose.png',
    unitName: 'Cookies',
    boxes: [
      {
        id: 'rose_snack_2pcs',
        name: 'Snack Pack',
        countLabel: 'Up to 2 Cookies',
        price: 40,
        desc: '2 Fragrant floral cookies infused with organic petals.',
        img: '/rose-box-2pcs.jpg'
      },
      {
        id: 'rose_classic_8pcs',
        name: 'Classic Box',
        countLabel: 'Up to 8 Cookies',
        price: 160,
        desc: '8 Handcrafted floral treats in signature bakery box.',
        img: '/rose-box-8pcs.jpg',
        popular: true
      },
      {
        id: 'rose_family_12pcs',
        name: 'Family Pack',
        countLabel: 'Up to 12 Cookies',
        price: 360,
        desc: '12 Fragrant rose cookies in our luxury packaging.',
        img: '/rose-box-12pcs.png'
      }
    ]
  },
  oatsnuts: {
    id: 'oatsnuts',
    name: 'Oats & Nuts Cookies',
    tagline: 'Rolled oats, roasted almonds, pistachios & honey',
    image: '/img-oats.png',
    unitName: 'Cookies',
    boxes: [
      {
        id: 'oatsnuts_snack_2pcs',
        name: 'Snack Pack',
        countLabel: 'Up to 2 Cookies',
        price: 40,
        desc: '2 Crunchy high-fibre cookies packed with nuts.',
        img: '/oats-box-2pcs.jpg'
      },
      {
        id: 'oatsnuts_classic_8pcs',
        name: 'Classic Box',
        countLabel: 'Up to 8 Cookies',
        price: 160,
        desc: '8 Wholesome energy-dense cookies in classic box.',
        img: '/oats-box-8pcs.jpg',
        popular: true
      },
      {
        id: 'oatsnuts_family_12pcs',
        name: 'Family Pack',
        countLabel: 'Up to 12 Cookies',
        price: 360,
        desc: '12 Nutritious cookies in luxury presentation box.',
        img: '/oats-box-12pcs.jpg'
      }
    ]
  },
  orange: {
    id: 'orange',
    name: 'Orange Peel Cookies',
    tagline: 'Zesty sun-dried orange peel with citrus butter',
    image: '/img-orange.png',
    unitName: 'Cookies',
    boxes: [
      {
        id: 'orange_snack_2pcs',
        name: 'Snack Pack',
        countLabel: 'Up to 2 Cookies',
        price: 40,
        desc: '2 Zesty citrus cookies with refreshing orange zest.',
        img: '/orange-box-2pcs.jpg'
      },
      {
        id: 'orange_classic_8pcs',
        name: 'Classic Box',
        countLabel: 'Up to 8 Cookies',
        price: 160,
        desc: '8 Orange peel treats in signature gift box.',
        img: '/orange-box-8pcs.jpg',
        popular: true
      },
      {
        id: 'orange_family_12pcs',
        name: 'Family Pack',
        countLabel: 'Up to 12 Cookies',
        price: 360,
        desc: '12 Refreshing citrus cookies in family feast box.',
        img: '/box-classic.jpg'
      }
    ]
  },
  walnut: {
    id: 'walnut',
    name: 'California Walnut Cookies',
    tagline: 'Rich buttery dough loaded with roasted California walnuts',
    image: '/img-walnut.png',
    unitName: 'Cookies',
    boxes: [
      {
        id: 'walnut_snack_2pcs',
        name: 'Snack Pack',
        countLabel: 'Up to 2 Cookies',
        price: 50,
        desc: '2 Nutty Omega-3 rich whole walnut cookies.',
        img: '/box-classic.jpg'
      },
      {
        id: 'walnut_classic_8pcs',
        name: 'Classic Box',
        countLabel: 'Up to 8 Cookies',
        price: 210,
        desc: '8 Premium roasted walnut cookies in signature gold box.',
        img: '/box-lush.jpg',
        popular: true
      },
      {
        id: 'walnut_family_12pcs',
        name: 'Family Pack',
        countLabel: 'Up to 12 Cookies',
        price: 420,
        desc: '12 Rich California walnut cookies for connoisseurs.',
        img: '/box-extra.jpg'
      }
    ]
  },
  walnut_sf: {
    id: 'walnut_sf',
    name: 'Sugar-Free Walnut Cookies',
    tagline: '100% Zero Added Sugar, Stevia sweetened & keto-friendly',
    image: '/img-walnut-sf.png',
    unitName: 'Cookies',
    boxes: [
      {
        id: 'walnut_sf_snack_2pcs',
        name: 'Snack Pack',
        countLabel: 'Up to 2 Cookies',
        price: 55,
        desc: '2 Zero-sugar guilt-free whole walnut cookies.',
        img: '/box-classic.jpg'
      },
      {
        id: 'walnut_sf_classic_8pcs',
        name: 'Classic Box',
        countLabel: 'Up to 8 Cookies',
        price: 220,
        desc: '8 Guilt-free diabetic-friendly treats in fresh box.',
        img: '/box-lush.jpg',
        popular: true
      },
      {
        id: 'walnut_sf_family_12pcs',
        name: 'Family Pack',
        countLabel: 'Up to 12 Cookies',
        price: 440,
        desc: '12 Keto-friendly walnut cookies in luxury collection box.',
        img: '/box-extra.jpg'
      }
    ]
  },
  strawberry: {
    id: 'strawberry',
    name: 'Strawberry Muffin',
    tagline: 'Delicate vanilla sponge infused with fresh Mahabaleshwar strawberries',
    image: '',
    unitName: 'Muffins',
    boxes: [
      {
        id: 'strawberry_single',
        name: 'Single Muffin',
        countLabel: '1 Muffin',
        price: 40,
        desc: 'Freshly baked delicious single muffin.',
        img: '/img-strawberry.jpg',
        popular: true
      }
    ]
  },
  pinacolada: {
    id: 'pinacolada',
    name: 'Pinacolada Muffins',
    tagline: 'Juicy golden pineapple tidbits embedded in vanilla butter sponge, crowned with toasted coconut flakes',
    image: '',
    unitName: 'Muffins',
    boxes: [
      {
        id: 'pinacolada_single',
        name: 'Single Muffin',
        countLabel: '1 Muffin',
        price: 40,
        desc: 'Freshly baked delicious single muffin.',
        img: '/img-pinacolada.jpg',
        popular: true
      }
    ]
  },
  butterscotch: {
    id: 'butterscotch',
    name: 'Butterscotch Muffins',
    tagline: 'Caramel cake base stuffed with crunchy butterscotch drops',
    image: '',
    unitName: 'Muffins',
    boxes: [
      {
        id: 'butterscotch_single',
        name: 'Single Muffin',
        countLabel: '1 Muffin',
        price: 40,
        desc: 'Freshly baked delicious single muffin.',
        img: '/img-butterscotch.jpg',
        popular: true
      }
    ]
  },
  chocochip: {
    id: 'chocochip',
    name: 'Chocochip Muffins',
    tagline: 'Decadent 70% dark cocoa sponge loaded with molten Belgian chocolate chips',
    image: '',
    unitName: 'Muffins',
    boxes: [
      {
        id: 'chocochip_single',
        name: 'Single Muffin',
        countLabel: '1 Muffin',
        price: 40,
        desc: 'Freshly baked delicious single muffin.',
        img: '/img-chocochip.jpg',
        popular: true
      }
    ]
  },
  blackcurrant: {
    id: 'blackcurrant',
    name: 'Black Currant Muffin',
    tagline: 'Whole wheat sponge bursting with tangy black currants and vanilla flavour',
    image: '',
    unitName: 'Muffins',
    boxes: [
      {
        id: 'blackcurrant_single',
        name: 'Single Muffin',
        countLabel: '1 Muffin',
        price: 40,
        desc: 'Freshly baked delicious single muffin.',
        img: '/img-blackcurrant.jpg',
        popular: true
      }
    ]
  }
};

let modalElement = null;
let currentSelectedProduct = null;
let currentSelectedBoxIndex = 1; // Default to Classic Box (index 1)
let currentQuantity = 1;

export function initQuickAddModal() {
  if (modalElement) return;

  modalElement = document.createElement('div');
  modalElement.id = 'modal-quick-box-selector';
  modalElement.style.cssText = `
    display: none;
    position: fixed;
    inset: 0;
    z-index: 999999;
    background: rgba(20, 14, 10, 0.76);
    backdrop-filter: blur(8px);
    -webkit-backdrop-filter: blur(8px);
    align-items: center;
    justify-content: center;
    padding: 16px;
  `;

  modalElement.innerHTML = `
    <div style="
      background: #FDFBF7;
      border: 1.5px solid #E8DFD5;
      border-radius: 24px;
      max-width: 720px;
      width: 100%;
      box-shadow: 0 25px 70px rgba(0,0,0,0.45);
      overflow: hidden;
      display: flex;
      flex-direction: column;
      animation: quickModalIn 0.28s cubic-bezier(0.16, 1, 0.3, 1);
      position: relative;
    ">
      <!-- Top Close Button -->
      <button id="qa-btn-close" style="
        position: absolute;
        top: 16px;
        right: 16px;
        z-index: 10;
        background: rgba(61, 32, 0, 0.08);
        border: none;
        color: #3D2000;
        font-size: 20px;
        width: 32px;
        height: 32px;
        border-radius: 50%;
        cursor: pointer;
        display: flex;
        align-items: center;
        justify-content: center;
        line-height: 1;
        transition: all 0.2s ease;
      ">&times;</button>

      <!-- Header -->
      <div id="qa-header-section" style="
        padding: 22px 24px 12px;
      ">
        <div style="display: flex; align-items: center; justify-content: space-between; gap: 12px; margin-bottom: 6px; padding-right: 36px;">
          <h3 style="margin: 0; display: flex; align-items: center; gap: 8px; font-family: var(--font-serif, serif); font-size: 19px; font-weight: 700; color: #2C1810;">
            <span>📦</span>
            <span id="qa-header-title">Select Box Size / Packaging:</span>
          </h3>
          <span style="
            background: #F6ECD5;
            color: #9C7000;
            font-size: 12px;
            font-weight: 700;
            padding: 5px 14px;
            border-radius: 20px;
            letter-spacing: 0.2px;
            white-space: nowrap;
          ">Brand Packaging (Included)</span>
        </div>
        <p style="margin: 0; color: #705840; font-size: 13.5px; line-height: 1.4;">
          Choose your delivery box size. Cookies are freshly baked and sealed inside your chosen pack:
        </p>
      </div>

      <!-- 3-Box Horizontal Card Grid -->
      <div id="qa-grid-container" style="padding: 12px 24px 18px; overflow-x: auto;">
        <div id="qa-box-grid" style="
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 14px;
        ">
          <!-- Dynamically Rendered 3 Cards -->
        </div>
      </div>

      <!-- Footer: Quantity Stepper, Price & Actions -->
      <div style="
        background: #F6F1EA;
        border-top: 1px solid rgba(61,32,0,0.08);
        padding: 18px 24px;
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 16px;
        flex-wrap: wrap;
      ">
        <!-- Quantity Stepper -->
        <div style="display: flex; align-items: center; gap: 10px;">
          <span id="qa-qty-label" style="font-size: 13.5px; font-weight: 600; color: #3D2000;">Boxes:</span>
          <div style="display: inline-flex; align-items: center; background: #FFF; border: 1.5px solid #D5C4B3; border-radius: 10px; overflow: hidden; box-shadow: 0 2px 5px rgba(0,0,0,0.04);">
            <button id="qa-qty-minus" style="padding: 6px 12px; background: transparent; border: none; font-size: 16px; font-weight: 700; cursor: pointer; color: #3D2000;">−</button>
            <span id="qa-qty-display" style="padding: 0 10px; font-size: 15px; font-weight: 700; color: #3D2000; min-width: 20px; text-align: center;">1</span>
            <button id="qa-qty-plus" style="padding: 6px 12px; background: transparent; border: none; font-size: 16px; font-weight: 700; cursor: pointer; color: #3D2000;">+</button>
          </div>
        </div>

        <!-- Total Price & Add to Cart -->
        <div style="display: flex; align-items: center; gap: 16px; margin-left: auto;">
          <div style="text-align: right;">
            <span style="font-size: 11px; color: #705840; display: block; text-transform: uppercase; font-weight: 600; letter-spacing: 0.5px;">Total Price</span>
            <strong id="qa-total-price" style="font-size: 22px; color: #2C1810; font-weight: 800;">₹160</strong>
          </div>

          <button id="qa-btn-add-basket" style="
            padding: 13px 24px;
            background: linear-gradient(135deg, #C6960C 0%, #A67C00 100%);
            color: #FFF;
            border: none;
            border-radius: 12px;
            font-size: 15px;
            font-weight: 700;
            cursor: pointer;
            box-shadow: 0 4px 16px rgba(198,150,12,0.35);
            display: flex;
            align-items: center;
            gap: 8px;
            transition: transform 0.15s ease, box-shadow 0.15s ease;
          ">
            <span>🛒 Add to Cookie Basket →</span>
          </button>
        </div>
      </div>
    </div>

    <!-- Embedded Box Photo Lightbox Preview -->
    <div id="qa-lightbox" style="
      display: none;
      position: fixed;
      inset: 0;
      z-index: 1000000;
      background: rgba(0,0,0,0.85);
      align-items: center;
      justify-content: center;
      padding: 20px;
    ">
      <div style="position: relative; max-width: 550px; width: 100%; background: #FFF; border-radius: 16px; overflow: hidden; box-shadow: 0 20px 60px rgba(0,0,0,0.6);">
        <button id="qa-lightbox-close" style="
          position: absolute;
          top: 12px;
          right: 12px;
          background: rgba(0,0,0,0.6);
          border: none;
          color: #FFF;
          font-size: 22px;
          width: 34px;
          height: 34px;
          border-radius: 50%;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
        ">&times;</button>
        <img id="qa-lightbox-img" src="" alt="Box Zoom" style="width: 100%; height: 360px; object-fit: cover; display: block;" />
        <div style="padding: 16px 20px; background: #FFFDF9;">
          <h4 id="qa-lightbox-title" style="margin: 0 0 4px; font-size: 16px; color: #2C1810;">Box Name</h4>
          <p id="qa-lightbox-desc" style="margin: 0; font-size: 13px; color: #705840;">Box Details</p>
        </div>
      </div>
    </div>
  `;

  document.body.appendChild(modalElement);

  // Close handlers
  document.getElementById('qa-btn-close')?.addEventListener('click', closeQuickAddModal);
  modalElement.addEventListener('click', (e) => {
    if (e.target === modalElement) closeQuickAddModal();
  });

  // Lightbox Close
  document.getElementById('qa-lightbox-close')?.addEventListener('click', () => {
    const lb = document.getElementById('qa-lightbox');
    if (lb) lb.style.display = 'none';
  });
  document.getElementById('qa-lightbox')?.addEventListener('click', (e) => {
    if (e.target.id === 'qa-lightbox') {
      e.currentTarget.style.display = 'none';
    }
  });

  // Quantity Steppers
  document.getElementById('qa-qty-minus')?.addEventListener('click', () => {
    if (currentQuantity > 1) {
      currentQuantity--;
      updateQuickAddFooter();
    }
  });

  document.getElementById('qa-qty-plus')?.addEventListener('click', () => {
    if (currentQuantity < 50) {
      currentQuantity++;
      updateQuickAddFooter();
    }
  });

  // Add to Basket
  document.getElementById('qa-btn-add-basket')?.addEventListener('click', () => {
    if (!currentSelectedProduct) return;
    const selectedBox = currentSelectedProduct.boxes[currentSelectedBoxIndex] || currentSelectedProduct.boxes[0];

    cartStore.addItem({
      id: selectedBox.id,
      productId: currentSelectedProduct.id,
      name: `${currentSelectedProduct.name} (${selectedBox.name} - ${selectedBox.countLabel})`,
      price: selectedBox.price,
      quantity: currentQuantity,
      image: selectedBox.img || currentSelectedProduct.image
    });

    closeQuickAddModal();
    eventBus.emit(Events.CART_OPEN);
  });
}

export function openQuickAddModal(productKey) {
  initQuickAddModal();

  const key = String(productKey || 'almond').trim().toLowerCase();
  const product = PRODUCT_BOX_CATALOG[key] || PRODUCT_BOX_CATALOG.almond;

  currentSelectedProduct = product;
  currentSelectedBoxIndex = product.boxes.findIndex(b => b.popular) !== -1 ? product.boxes.findIndex(b => b.popular) : 0;
  currentQuantity = 1;

  const headerSection = document.getElementById('qa-header-section');
  const gridContainer = document.getElementById('qa-grid-container');
  const qtyLabel = document.getElementById('qa-qty-label');

  if (product.unitName === 'Muffins') {
    if (headerSection) headerSection.style.display = 'none';
    if (gridContainer) gridContainer.style.display = 'block';
    if (qtyLabel) qtyLabel.textContent = 'Quantity:';
  } else {
    if (headerSection) headerSection.style.display = 'block';
    if (gridContainer) gridContainer.style.display = 'block';
    if (qtyLabel) qtyLabel.textContent = 'Boxes:';
  }

  renderBoxOptionCards();
  updateQuickAddFooter();

  modalElement.style.display = 'flex';
  document.body.style.overflow = 'hidden';
}

export function closeQuickAddModal() {
  if (modalElement) {
    modalElement.style.display = 'none';
    document.body.style.overflow = '';
  }
}

function renderBoxOptionCards() {
  const container = document.getElementById('qa-box-grid');
  if (!container || !currentSelectedProduct) return;

  if (currentSelectedProduct.boxes.length === 1) {
    container.style.display = 'flex';
    container.style.justifyContent = 'center';
  } else {
    container.style.display = 'grid';
    container.style.gridTemplateColumns = 'repeat(3, 1fr)';
  }

  container.innerHTML = currentSelectedProduct.boxes.map((box, index) => {
    const isSelected = index === currentSelectedBoxIndex;
    const cardBorder = isSelected ? '2px solid #5B2C6F' : '1.5px solid #E8E0D7';
    const cardBg = isSelected ? '#FAF5FF' : '#FFFFFF';
    const cardShadow = isSelected ? '0 6px 20px rgba(91, 44, 111, 0.12)' : 'none';

    return `
      <div class="qa-box-card" data-index="${index}" style="
        border: ${cardBorder};
        background: ${cardBg};
        border-radius: 16px;
        padding: 12px;
        cursor: pointer;
        display: flex;
        flex-direction: column;
        align-items: center;
        text-align: center;
        box-shadow: ${cardShadow};
        transition: all 0.2s cubic-bezier(0.16, 1, 0.3, 1);
        position: relative;
      ">
        <!-- Box Image Container -->
        <div style="
          width: 100%;
          height: 120px;
          border-radius: 10px;
          overflow: hidden;
          position: relative;
          background: #EFE9E0;
          margin-bottom: 10px;
        ">
          ${box.img ? `<img src="${box.img}" alt="${box.name}" fetchpriority="high" decoding="async" style="
            width: 100%;
            height: 100%;
            object-fit: cover;
            display: block;
          " />` : ''}

          <!-- Selected Check Badge -->
          ${isSelected ? `
            <div style="
              position: absolute;
              top: 6px;
              right: 6px;
              background: #5B2C6F;
              color: #FFF;
              font-size: 11px;
              font-weight: 700;
              padding: 3px 8px;
              border-radius: 12px;
              display: flex;
              align-items: center;
              gap: 3px;
              box-shadow: 0 2px 6px rgba(0,0,0,0.25);
            ">
              <span>✓ Selected</span>
            </div>
          ` : ''}

          <!-- View Box Button Pill -->
          <button class="btn-qa-view-box" data-index="${index}" style="
            position: absolute;
            bottom: 6px;
            right: 6px;
            background: rgba(20, 14, 10, 0.72);
            color: #FFF;
            border: none;
            font-size: 11px;
            font-weight: 600;
            padding: 3px 8px;
            border-radius: 12px;
            cursor: pointer;
            display: flex;
            align-items: center;
            gap: 3px;
            backdrop-filter: blur(4px);
            -webkit-backdrop-filter: blur(4px);
          ">
            <span>🔍 View Box</span>
          </button>
        </div>

        <!-- Box Title -->
        <h4 style="
          margin: 0 0 3px;
          font-size: 15px;
          font-weight: 700;
          color: #2C1810;
        ">${box.name}</h4>

        <!-- Piece Count Label -->
        <span style="
          font-size: 13px;
          font-weight: 700;
          color: #5B2C6F;
          margin-bottom: 6px;
          display: block;
        ">${box.countLabel}</span>

        <!-- Price -->
        <div style="
          font-size: 18px;
          font-weight: 800;
          color: #2C1810;
          margin-top: auto;
        ">₹${box.price}</div>
      </div>
    `;
  }).join('');

  // Attach card selection listeners
  container.querySelectorAll('.qa-box-card').forEach(card => {
    card.addEventListener('click', (e) => {
      // If clicked on "View Box", do not toggle selection, open lightbox
      if (e.target.closest('.btn-qa-view-box')) return;
      const idx = parseInt(card.getAttribute('data-index'), 10);
      currentSelectedBoxIndex = idx;
      renderBoxOptionCards();
      updateQuickAddFooter();
    });
  });

  // Attach View Box Lightbox Click Listeners
  container.querySelectorAll('.btn-qa-view-box').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      const idx = parseInt(btn.getAttribute('data-index'), 10);
      const box = currentSelectedProduct.boxes[idx];
      if (box) {
        document.getElementById('qa-lightbox-img').src = box.img;
        document.getElementById('qa-lightbox-title').textContent = `${currentSelectedProduct.name} - ${box.name} (${box.countLabel})`;
        document.getElementById('qa-lightbox-desc').textContent = box.desc || `Freshly baked and sealed in artisanal ${box.name}.`;
        const lb = document.getElementById('qa-lightbox');
        if (lb) lb.style.display = 'flex';
      }
    });
  });
}

function updateQuickAddFooter() {
  if (!currentSelectedProduct) return;
  const selectedBox = currentSelectedProduct.boxes[currentSelectedBoxIndex] || currentSelectedProduct.boxes[0];
  const total = selectedBox.price * currentQuantity;

  const qtyDisplay = document.getElementById('qa-qty-display');
  const totalDisplay = document.getElementById('qa-total-price');

  if (qtyDisplay) qtyDisplay.textContent = currentQuantity;
  if (totalDisplay) totalDisplay.textContent = `₹${total}`;
}
