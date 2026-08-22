import './style.css';
import * as THREE from 'three';
import { initNetworkMonitor } from './sessionState.js';
import { Analytics } from './services/Analytics.js';
import { cartStore } from './services/CartStore.js';
import { authController } from './controllers/AuthController.js';

const PRODUCTS_DATA = {
  almond: {
    id: 'almond',
    name: 'Almond Cookies',
    category: 'Signature Cookie',
    categoryLink: 'Cookies',
    tagline: 'Crafted with whole roasted almonds — rich, buttery crunch with every single bite.',
    price: 160,
    rating: '5.0',
    reviewsCount: 128,
    badges: ['Nut Rich', 'Organic Honey', 'Zero Dalda'],
    desc: 'A timeless classic reimagined. Crafted with whole roasted premium California almonds, organic cow butter, and raw honey. Crumbly on the outside, meltingly soft on the inside with a nutty aroma.',
    type: 'cookie',
    color: 0xD4A373,
    nutrition: {
      cal: 72.7,
      carbs: '5.1g',
      protein: '1.51g',
      fat: '5.14g',
      satFat: '3g',
      transFat: '0g',
      sugar: '3.25g',
      sodium: '89.6mg',
      potassium: '397.2mg',
      fibre: '1.5g'
    },
    ingredients: 'Whole Roasted Almonds, Unbleached Wheat Flour, Pure Cow Butter, Organic Raw Honey, Cardamom Extract, Sea Salt.',
    reviews: [
      { name: 'Ananya Roy', location: 'Bengaluru', rating: 5, text: 'Absolutely heavenly! The buttery crunch and generous almond bits make these my favorite morning pairing with chai.' },
      { name: 'Rohan Mehta', location: 'Indiranagar', rating: 5, text: 'Freshly baked perfection! You can taste the purity of honey and butter instead of sickly sweet sugar.' },
      { name: 'Priya Sharma', location: 'Koramangala', rating: 5, text: 'The texture is incredible — crisp on the edges and soft in the middle. Packaging was spotless and fresh.' }
    ]
  },
  rose: {
    id: 'rose',
    name: 'Rose Petal Cookies',
    category: 'Floral Delicacy',
    categoryLink: 'Cookies',
    tagline: 'Infused with edible Damask rose petals and cardamom for an aromatic tea-time luxury.',
    price: 160,
    rating: '4.9',
    reviewsCount: 96,
    badges: ['Edible Rose', 'Low GI', 'Handcrafted'],
    desc: 'Inspired by royal Indian confections. Hand-picked organic Damask rose petals infused into slow-baked butter dough with subtle cardamom undertones.',
    type: 'cookie',
    color: 0xE8A598,
    nutrition: {
      cal: 67.25,
      carbs: '7.01g',
      fat: '3.9g',
      satFat: '2.8g',
      transFat: '0g',
      sugar: '3.24g',
      protein: '1.04g',
      sodium: '139.4mg',
      potassium: '268.4mg',
      fibre: '1.1g'
    },
    ingredients: 'Organic Damask Rose Petals, Whole Wheat Flour, Pure Desi Ghee, Raw Cane Sugar, Cardamom Pods, Almond Flakes.',
    reviews: [
      { name: 'Kavita Sundaram', location: 'Chennai', rating: 5, text: 'The floral scent when opening the box is divine! Not overly sweet, perfect balance.' },
      { name: 'Deepak Rao', location: 'Whitefield', rating: 5, text: 'My mother loves rose flavored treats and she rated this 10 out of 10!' }
    ]
  },
  oatsnuts: {
    id: 'oatsnuts',
    name: 'Oats & Nuts Cookies',
    category: 'Wholesome Crunch',
    categoryLink: 'Cookies',
    tagline: 'Hearty rolled oats, walnuts, and chia seeds sweetened naturally with organic raw honey.',
    price: 160,
    rating: '4.95',
    reviewsCount: 142,
    badges: ['High Fibre', 'Rolled Oats', 'Superfood Nutrients'],
    desc: 'Packed with nutrient-dense rolled oats, California walnuts, flaxseeds, and organic honey. Perfect for a clean pre-workout boost or high-fibre mid-day snack.',
    type: 'cookie',
    color: 0xC59B6C,
    nutrition: {
      cal: 71.25,
      carbs: '5.2g',
      protein: '1.45g',
      fat: '4.5g',
      satFat: '4.11g',
      transFat: '0g',
      sugar: '2.32g',
      sodium: '306.1mg',
      potassium: '367.5mg',
      fibre: '2.4g'
    },
    ingredients: 'Rolled Oats, California Walnuts, Chia Seeds, Raw Apiary Honey, Organic Butter, Cinnamon Spice.',
    reviews: [
      { name: 'Siddharth V.', location: 'HSR Layout', rating: 5, text: 'My daily morning coffee companion. Filling, wholesome, and delicious without the guilt.' },
      { name: 'Neha Kapoor', location: 'Mumbai', rating: 5, text: 'Love the high fibre crunch. Tastes real and clean!' }
    ]
  },
  orange: {
    id: 'orange',
    name: 'Orange Peel Cookies',
    category: 'Zesty Refreshment',
    categoryLink: 'Cookies',
    tagline: 'Sun-ripened orange zest fused with warm Ceylon cinnamon for a vibrant citrus crunch.',
    price: 160,
    rating: '4.88',
    reviewsCount: 84,
    badges: ['Citrus Zest', 'Ceylon Cinnamon', 'Fresh Baked'],
    desc: 'Bursting with natural citrus oils from cold-pressed orange peel and Ceylon cinnamon. A refreshing twist on traditional shortbread.',
    type: 'cookie',
    color: 0xE07A5F,
    nutrition: {
      cal: 89.25,
      carbs: '9.5g',
      protein: '1.63g',
      fat: '4.95g',
      satFat: '3.40g',
      transFat: '0g',
      sugar: '3.5g',
      sodium: '45.5mg',
      potassium: '60.5mg',
      fibre: '1.4g'
    },
    ingredients: 'Fresh Orange Zest, Ceylon Cinnamon, Whole Grain Flour, Butter, Natural Honey, Vanilla Bean.',
    reviews: [
      { name: 'Arjun Das', location: 'Hyderabad', rating: 5, text: 'The citrus aroma is wonderful! So fresh and crisp.' },
      { name: 'Sneha Patel', location: 'Pune', rating: 5, text: 'Unique flavor combination. My kids enjoyed it immensely.' }
    ]
  },
  walnut: {
    id: 'walnut',
    name: 'Walnut Cookies',
    category: 'Nutrient Rich',
    categoryLink: 'Cookies',
    tagline: 'Loaded with whole California walnut halves & buttery brown sugar crunch.',
    price: 210,
    rating: '5.0',
    reviewsCount: 110,
    badges: ['Brain Food', 'Omega-3 Rich', 'Zero Dalda'],
    desc: 'Rich, hearty, and packed with crunchy California walnut halves, brown sugar, and organic cow butter. High in Omega-3 fatty acids and natural brain nutrients.',
    type: 'cookie',
    color: 0x966035,
    nutrition: {
      cal: 76.5,
      carbs: '4.8g',
      protein: '1.65g',
      fat: '5.4g',
      satFat: '3.1g',
      transFat: '0g',
      sugar: '2.1g',
      sodium: '95.2mg',
      potassium: '345.8mg',
      fibre: '2.4g'
    },
    ingredients: 'California Walnut Halves, Unbleached Wheat Flour, Pure Cow Butter, Raw Honey, Vanilla Bean Extract.',
    reviews: [
      { name: 'Siddharth Rao', location: 'Mumbai', rating: 5, text: 'The walnut crunch is out of this world! Melt in the mouth buttery texture with whole walnuts.' }
    ]
  },
  walnut_sf: {
    id: 'walnut_sf',
    name: 'Sugar-Free Walnut Cookies',
    category: 'Diabetic Friendly',
    categoryLink: 'Cookies',
    tagline: '100% Sugar-Free. Whole roasted walnuts sweetened with natural Stevia & Erythritol.',
    price: 220,
    rating: '4.98',
    reviewsCount: 88,
    badges: ['Sugar-Free', 'Keto Friendly', 'Guilt-Free'],
    desc: 'Delightfully guilt-free! Crafted specifically for health-conscious and diabetic cookie lovers. Loaded with roasted California walnuts, almond flour, and sweetened naturally with zero-calorie Stevia.',
    type: 'cookie',
    color: 0x825028,
    nutrition: {
      cal: 64.0,
      carbs: '2.8g',
      protein: '1.75g',
      fat: '5.2g',
      satFat: '2.7g',
      transFat: '0g',
      sugar: '0g',
      sodium: '92.4mg',
      potassium: '310.6mg',
      fibre: '3.8g'
    },
    ingredients: 'California Walnuts, Almond Meal, Pure Butter, Stevia Leaf Extract, Erythritol, Sea Salt.',
    reviews: [
      { name: 'Dr. Meera Iyer', location: 'Bengaluru', rating: 5, text: 'Finally a sugar-free cookie that tastes truly authentic! Perfect for diabetic cravings without spike.' }
    ]
  },
  strawberry: {
    id: 'strawberry',
    name: 'Strawberry Muffins',
    category: 'Handcrafted Muffin',
    categoryLink: 'Muffins',
    tagline: 'Soft, airy sponge folded with real farm-fresh Mahabaleshwar strawberries & berry compote.',
    price: 130,
    rating: '4.92',
    reviewsCount: 110,
    badges: ['Real Fruit', 'Soft Sponge', 'Zero Preservatives'],
    desc: 'Moist and fluffy muffin crown baked with real strawberry compote and farm-fresh berry chunks. Topped with a delicate honey glaze.',
    type: 'muffin',
    color: 0xE63946,
    nutrition: { cal: 175, carbs: '24g', protein: '4.5g', fat: '7g', sugar: '10g', fibre: '1.8g' },
    ingredients: 'Mahabaleshwar Strawberries, Whole Wheat Sponge, Organic Honey, Cold-Pressed Milk, Pure Vanilla Extract.',
    reviews: [
      { name: 'Meera Iyer', location: 'Bengaluru', rating: 5, text: 'So soft and fluffy! The real strawberry chunks inside make all the difference.' },
      { name: 'Vikram Joshi', location: 'Delhi', rating: 5, text: 'Ordered a 6-pack for tea party, everyone asked where I got them.' }
    ]
  },
  pineapple: {
    id: 'pineapple',
    name: 'Pineapple Muffins',
    category: 'Handcrafted Muffin',
    categoryLink: 'Muffins',
    tagline: 'Tropical golden pineapple bits folded into moist golden sponge topped with coconut flakes.',
    price: 135,
    rating: '4.89',
    reviewsCount: 78,
    badges: ['Tropical Fruit', 'Golden Sponge', 'Toasted Coconut'],
    desc: 'Transport your palate to the tropics. Juicy golden pineapple tidbits embedded in vanilla butter sponge, crowned with toasted coconut flakes.',
    type: 'muffin',
    color: 0xF4A261,
    nutrition: { cal: 170, carbs: '23g', protein: '4g', fat: '6.8g', sugar: '9.5g', fibre: '1.6g' },
    ingredients: 'Golden Pineapple Cubes, Toasted Coconut Flakes, Pure Cow Milk, Whole Flour, Honey, Vanilla.',
    reviews: [
      { name: 'Rajesh Kumar', location: 'Kochi', rating: 5, text: 'Tangy and sweet pineapple flavor balance is spot on!' }
    ]
  },
  butterscotch: {
    id: 'butterscotch',
    name: 'Butterscotch Muffins',
    category: 'Handcrafted Muffin',
    categoryLink: 'Muffins',
    tagline: 'Rich caramelized brown sugar sponge studded with crunchy butterscotch praline morsels.',
    price: 140,
    rating: '4.96',
    reviewsCount: 156,
    badges: ['Caramel Praline', 'Rich Butter', 'Baker Special'],
    desc: 'An indulgent dessert muffin. Slow-caramelized jaggery and brown sugar sponge filled with golden butterscotch crunch nuggets.',
    type: 'muffin',
    color: 0xE76F51,
    nutrition: { cal: 185, carbs: '26g', protein: '4.2g', fat: '8g', sugar: '11g', fibre: '1.1g' },
    ingredients: 'House Butterscotch Praline, Caramelized Jaggery, Organic Butter, Milk, Wheat Sponge, Cinnamon.',
    reviews: [
      { name: 'Simran Gill', location: 'Chandigarh', rating: 5, text: 'The butterscotch crunch on top stays crispy! Incredible recipe.' }
    ]
  },
  choco: {
    id: 'choco',
    name: 'Choco Muffins',
    category: 'Handcrafted Muffin',
    categoryLink: 'Muffins',
    tagline: 'Decadent 70% dark cocoa sponge loaded with molten Belgian chocolate chips.',
    price: 150,
    rating: '4.98',
    reviewsCount: 210,
    badges: ['70% Dark Cocoa', 'Belgian Choco', 'Molten Center'],
    desc: 'For true chocolate lovers. Rich 70% single-origin dark cocoa sponge packed with generous Belgian chocolate chips that melt when warmed.',
    type: 'muffin',
    color: 0x4A2E2B,
    nutrition: { cal: 195, carbs: '25g', protein: '5g', fat: '9g', sugar: '10g', fibre: '2.5g' },
    ingredients: '70% Dark Belgian Chocolate, Dutch Cocoa Powder, Organic Butter, Raw Sugar, Whole Milk.',
    reviews: [
      { name: 'Aakash Verma', location: 'Bengaluru', rating: 5, text: 'Warm this up for 10 seconds in microwave... pure molten chocolate bliss!' },
      { name: 'Tara Bose', location: 'Kolkata', rating: 5, text: 'Rich dark chocolate taste without being overly sugary. Highest quality.' }
    ]
  }
};

// Authentic Bakery Box Sizes (Rose Petal & Roasted Almond Cookies)
const COOKIE_BOX_OPTIONS = {
  rose: [
    {
      id: 'rose_snack_2pcs',
      name: 'Snack Pack',
      cookieCount: 2,
      countLabel: 'Up to 2 Cookies',
      price: 40,
      unit: '/ pack (2 freshly baked cookies)',
      img: '/rose-box-2pcs.jpg',
      badge: '2 Cookies'
    },
    {
      id: 'rose_classic_8pcs',
      name: 'Classic Box',
      cookieCount: 8,
      countLabel: 'Up to 8 Cookies',
      price: 160,
      unit: '/ box (8 freshly baked pieces)',
      img: '/rose-box-8pcs.jpg',
      badge: '8 Cookies · Popular',
      default: true
    },
    {
      id: 'rose_family_12pcs',
      name: 'Family Pack',
      cookieCount: 12,
      countLabel: 'Up to 12 Cookies',
      price: 360,
      unit: '/ box (12 freshly baked pieces · 300g)',
      img: '/rose-box-12pcs.png?v=2',
      badge: '12 Cookies · 300g'
    }
  ],
  almond: [
    {
      id: 'almond_snack_2pcs',
      name: 'Snack Pack',
      cookieCount: 2,
      countLabel: 'Up to 2 Cookies',
      price: 40,
      unit: '/ pack (2 freshly baked cookies)',
      img: '/almond-box-2pcs.png?v=2',
      badge: '2 Cookies'
    },
    {
      id: 'almond_classic_8pcs',
      name: 'Classic Box',
      cookieCount: 8,
      countLabel: 'Up to 8 Cookies',
      price: 160,
      unit: '/ box (8 freshly baked pieces)',
      img: '/almond-box-8pcs.jpg',
      badge: '8 Cookies · Popular',
      default: true
    },
    {
      id: 'almond_family_12pcs',
      name: 'Family Pack',
      cookieCount: 12,
      countLabel: 'Up to 12 Cookies',
      price: 360,
      unit: '/ box (12 freshly baked pieces · 300g)',
      img: '/almond-box-12pcs.png?v=2',
      badge: '12 Cookies · 300g'
    }
  ],
  orange: [
    {
      id: 'orange_snack_2pcs',
      name: 'Snack Pack',
      cookieCount: 2,
      countLabel: 'Up to 2 Cookies',
      price: 40,
      unit: '/ pack (2 freshly baked cookies)',
      img: '/orange-box-2pcs.jpg',
      badge: '2 Cookies · Soft & Chewy'
    },
    {
      id: 'orange_classic_8pcs',
      name: 'Classic Box',
      cookieCount: 8,
      countLabel: 'Up to 8 Cookies',
      price: 160,
      unit: '/ box (8 freshly baked pieces)',
      img: '/orange-box-8pcs.jpg',
      badge: '8 Cookies · Popular',
      default: true
    }
  ],
  oatsnuts: [
    {
      id: 'oatsnuts_snack_2pcs',
      name: 'Snack Pack',
      cookieCount: 2,
      countLabel: 'Up to 2 Cookies',
      price: 40,
      unit: '/ pack (2 freshly baked cookies)',
      img: '/oats-box-2pcs.jpg',
      badge: '2 Cookies · Immunity'
    },
    {
      id: 'oatsnuts_classic_8pcs',
      name: 'Classic Box',
      cookieCount: 8,
      countLabel: 'Up to 8 Cookies',
      price: 160,
      unit: '/ box (8 freshly baked pieces)',
      img: '/oats-box-8pcs.jpg',
      badge: '8 Cookies · Popular',
      default: true
    },
    {
      id: 'oatsnuts_family_12pcs',
      name: 'Family Pack',
      cookieCount: 12,
      countLabel: 'Up to 12 Cookies',
      price: 360,
      unit: '/ box (12 freshly baked pieces · 300g)',
      img: '/oats-box-12pcs.jpg',
      badge: '12 Cookies · 300g'
    }
  ]
};

// Global State
let currentProduct = PRODUCTS_DATA.almond;
let selectedQuantity = 1;
let selectedPackaging = 'none'; // 'none' (default +0), 'classic' (+15), or 'lush' (+130)
let selectedBoxOption = null;
let cart = [];

// ----------------------------------------------------
// 2. INITIALIZATION ON DOM READY
// ----------------------------------------------------
document.addEventListener('DOMContentLoaded', () => {
  // Parse Product ID from URL ?id=...
  const urlParams = new URLSearchParams(window.location.search);
  const productId = urlParams.get('id');
  if (productId && PRODUCTS_DATA[productId]) {
    currentProduct = PRODUCTS_DATA[productId];
  }

  // Update Page Title
  document.title = `${currentProduct.name} — mingmorsels`;

  // Render Product DOM Details
  renderProductDetails();

  // Initialize Pack Size Selector (Rose Petal Cookies Box Sizes)
  initPackSizeSelector();

  // Initialize Packaging Box Selector
  initPackagingSelector();

  // Initialize Product Gallery
  initProductGallery();

  // Initialize Cart & Event Handlers
  initCartSystem();

  // Render Related Products Grid
  renderRelatedProducts();

  // Initialize Live Social Proof Purchase Popup
  try { initLivePurchaseNotifications(); } catch(e) { console.error('Live purchase pop-up error:', e); }

  // Initialize Review Submission & Moderation Handlers
  try { initReviewSubmission(); } catch(e) { console.error('Review form error:', e); }

  // Initialize Network Resilience Monitor
  try { initNetworkMonitor(); } catch(e) { console.error('Network monitor error:', e); }

  // Initialize Pincode Live Estimator
  try { initPincodeChecker(); } catch(e) { console.error('Pincode checker error:', e); }

  // Initialize Auth & Account Dashboard
  try { authController.init(); } catch(e) { console.error('Auth controller error:', e); }
});

// ----------------------------------------------------
// 3. DOM POPULATION FUNCTION
// ----------------------------------------------------
function renderProductDetails() {
  const p = currentProduct;

  // Track GA4 view_item event
  try { Analytics.trackViewItem(p); } catch (e) {}

  // Breadcrumbs
  document.getElementById('bc-product-name').textContent = p.name;
  const catLink = document.getElementById('bc-category-link');
  if (catLink) {
    catLink.textContent = p.categoryLink;
    catLink.href = p.type === 'muffin' ? '/#muffins' : '/#products';
  }

  // Hero Section
  document.getElementById('p-category').textContent = p.category;
  document.getElementById('p-title').textContent = p.name;
  document.getElementById('p-tagline').textContent = p.tagline;
  document.getElementById('p-stars').textContent = '★'.repeat(Math.round(parseFloat(p.rating)));
  document.getElementById('p-rating').textContent = `${p.rating} (${p.reviewsCount} Verified Reviews)`;
  document.getElementById('p-price').textContent = p.price;
  document.getElementById('p-desc').textContent = p.desc;
  document.getElementById('p-btn-total-price').textContent = `₹${p.price * selectedQuantity}`;

  // WhatsApp Order Link update
  const waBtn = document.getElementById('btn-whatsapp-order');
  if (waBtn) {
    const text = encodeURIComponent(`Hi mingmorsels! I would like to order "${p.name}" (₹${p.price}) freshly baked.`);
    waBtn.href = `https://wa.me/918884102020?text=${text}`;
  }

  // Badges
  const badgesContainer = document.getElementById('p-badges');
  if (badgesContainer) {
    badgesContainer.innerHTML = p.badges.map(b => `<span class="badge">${b}</span>`).join('');
  }



  // Nutrition Grid
  if (document.getElementById('p-nut-cal')) document.getElementById('p-nut-cal').textContent = p.nutrition.cal;
  if (document.getElementById('p-nut-carbs')) document.getElementById('p-nut-carbs').textContent = p.nutrition.carbs;
  if (document.getElementById('p-nut-protein')) document.getElementById('p-nut-protein').textContent = p.nutrition.protein;
  if (document.getElementById('p-nut-fat')) document.getElementById('p-nut-fat').textContent = p.nutrition.fat;
  if (document.getElementById('p-nut-satfat')) document.getElementById('p-nut-satfat').textContent = p.nutrition.satFat || '2.8g';
  if (document.getElementById('p-nut-transfat')) document.getElementById('p-nut-transfat').textContent = p.nutrition.transFat || '0g';
  if (document.getElementById('p-nut-sugar')) document.getElementById('p-nut-sugar').textContent = p.nutrition.sugar;
  if (document.getElementById('p-nut-sodium')) document.getElementById('p-nut-sodium').textContent = p.nutrition.sodium || '139.4mg';
  if (document.getElementById('p-nut-potassium')) document.getElementById('p-nut-potassium').textContent = p.nutrition.potassium || '268.4mg';
  if (document.getElementById('p-nut-fibre')) document.getElementById('p-nut-fibre').textContent = p.nutrition.fibre || '1.1g';

  // Reviews Summary & AI Sentiment Classification
  document.getElementById('p-avg-score').textContent = p.rating;

  // Call AI Sentiment Classifier API
  fetch('/api/sentiment/analyze', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ reviews: p.reviews })
  }).then(res => res.json()).then(data => {
    if (data.success) {
      const summaryBadge = document.getElementById('p-avg-score');
      if (summaryBadge) {
        summaryBadge.innerHTML = `${p.rating} <span style="font-size:12px; background:rgba(200,150,12,0.15); border:1px solid rgba(200,150,12,0.3); color:#C8960C; padding:3px 10px; border-radius:50px; margin-left:8px;">${data.summary_badge}</span>`;
      }
    }
  }).catch(() => {});

  // Reviews List
  renderProductReviewsList(p);

  // Fetch dynamically approved customer reviews from backend
  fetch(`/api/reviews/${p.id}`)
    .then(res => res.json())
    .then(data => {
      if (data.success && Array.isArray(data.reviews) && data.reviews.length > 0) {
        const combined = [...data.reviews, ...(p.reviews || [])];
        renderProductReviewsList({ ...p, reviews: combined });
      }
    })
    .catch(() => {});
}

function renderProductReviewsList(p) {
  const reviewsContainer = document.getElementById('p-reviews-list');
  if (reviewsContainer && p.reviews && p.reviews.length > 0) {
    reviewsContainer.innerHTML = p.reviews.map((r, idx) => `
      <div class="review-card">
        <div class="review-header">
          <div class="review-author">
            <div class="avatar-circle" style="background: ${getAvatarColor(idx)};">${(r.name || 'C').charAt(0)}</div>
            <div>
              <h5 style="display:flex; align-items:center; gap:8px;">${r.name} <span class="badge" style="font-size:10px; padding:2px 8px; background:rgba(46,204,113,0.12); color:#2ECC71; border:1px solid rgba(46,204,113,0.3);">${r.sentiment || '😍 Loved It'}</span></h5>
              <span class="review-date">${r.location || 'Bengaluru'} • Verified Buyer</span>
            </div>
          </div>
          <div class="stars-gold">${'★'.repeat(r.rating || 5)}</div>
        </div>
        <p class="review-text">"${r.text}"</p>
      </div>
    `).join('');
  }
}

function initReviewSubmission() {
  const form = document.getElementById('form-submit-review');
  const feedbackBox = document.getElementById('review-form-feedback');
  const submitBtn = document.getElementById('btn-submit-review-action');
  if (!form) return;

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const nameInput = document.getElementById('review-name');
    const locInput = document.getElementById('review-location');
    const ratingInput = document.getElementById('review-rating');
    const textInput = document.getElementById('review-text');

    const name = nameInput ? nameInput.value.trim() : '';
    const location = locInput && locInput.value.trim() ? locInput.value.trim() : 'Bengaluru';
    const rating = ratingInput ? parseInt(ratingInput.value, 10) : 5;
    const text = textInput ? textInput.value.trim() : '';

    if (!name || !text) {
      alert('Please fill out your name and review comments.');
      return;
    }

    if (submitBtn) {
      submitBtn.disabled = true;
      submitBtn.textContent = 'Submitting Feedback...';
    }

    try {
      const res = await fetch('/api/reviews/submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          productId: currentProduct.id,
          name,
          location,
          rating,
          text
        })
      });

      const data = await res.json();
      if (feedbackBox) {
        feedbackBox.style.display = 'block';
        if (data.success) {
          feedbackBox.style.background = 'rgba(46, 204, 113, 0.12)';
          feedbackBox.style.border = '1px solid rgba(46, 204, 113, 0.35)';
          feedbackBox.style.color = '#27ae60';
          feedbackBox.innerHTML = `✨ <strong>Thank you, ${name}!</strong> Your review has been submitted for moderation and will appear live once approved by our confectionery artisans.`;
          form.reset();
        } else {
          feedbackBox.style.background = 'rgba(231, 76, 60, 0.12)';
          feedbackBox.style.border = '1px solid rgba(231, 76, 60, 0.35)';
          feedbackBox.style.color = '#e74c3c';
          feedbackBox.innerHTML = `⚠️ ${data.error || 'Failed to submit review. Please try again.'}`;
        }
      }
    } catch (err) {
      if (feedbackBox) {
        feedbackBox.style.display = 'block';
        feedbackBox.style.background = 'rgba(231, 76, 60, 0.12)';
        feedbackBox.style.border = '1px solid rgba(231, 76, 60, 0.35)';
        feedbackBox.style.color = '#e74c3c';
        feedbackBox.innerHTML = '⚠️ Network connection issue. Please try again shortly.';
      }
    } finally {
      if (submitBtn) {
        submitBtn.disabled = false;
        submitBtn.textContent = 'Submit Verified Review';
      }
    }
  });
}

function getAvatarColor(index) {
  const colors = ['#C8963E', '#4A6B5D', '#8C533E', '#2B4C7E', '#7E2B54'];
  return colors[index % colors.length];
}

// ----------------------------------------------------
// 4. STANDALONE THREE.JS 3D PRODUCT VIEWER
// ----------------------------------------------------
let scene, camera, renderer, productGroup;
let isDragging = false;
function initProductGallery() {
  const mainImage = document.getElementById('product-main-image');
  const thumbsContainer = document.querySelector('.product-thumbnails');
  
  if (!mainImage || !thumbsContainer) return;

  thumbsContainer.innerHTML = ''; // clear existing
  let images = [];
  
  if (currentProduct.id === 'orange') {
    images = [
      { src: '/orange-peel/10.jpg', alt: 'Orange Peel Box' },
      { src: '/orange-peel/12.jpg', alt: 'Orange Peel Box Horizontal' },
      { src: '/orange-peel/7.jpg', alt: 'Orange Peel Infographic' },
      { src: '/orange-peel/9.jpg', alt: 'Orange Peel Features' },
      { src: '/orange-peel/11.jpg', alt: 'Orange Peel Mixed' }
    ];
  } else if (currentProduct.id === 'oatsnuts') {
    images = [
      { src: '/oats-nuts/2.jpg', alt: 'Oats Nuts Box Horizontal' },
      { src: '/oats-nuts/1.jpg', alt: 'Oats Nuts Box Vertical' },
      { src: '/oats-nuts/4.jpg', alt: 'Oats Nuts Features' },
      { src: '/oats-nuts/3.jpg', alt: 'Oats Nuts Mixed' }
    ];
  } else if (currentProduct.id === 'rose') {
    images = [
      { src: '/rose-petal/2.jpg', alt: 'Rose Petal Box Horizontal' },
      { src: '/rose-petal/1.jpg', alt: 'Rose Petal Box Vertical' },
      { src: '/rose-petal/4.jpg', alt: 'Rose Petal Features' },
      { src: '/rose-petal/3.jpg', alt: 'Rose Petal Mixed Platter' }
    ];
  } else if (currentProduct.id === 'almond') {
    images = [
      { src: '/almond/2.jpg', alt: 'Almond Box Horizontal' },
      { src: '/almond/1.jpg', alt: 'Almond Box Vertical' },
      { src: '/almond/4.jpg', alt: 'Almond Features' },
      { src: '/almond/3.jpg', alt: 'Almond Mixed Platter' }
    ];
  } else {
    images = [
      { src: `/img-${currentProduct.id}.png`, alt: currentProduct.name }
    ];
  }

  if (images.length > 0) {
    mainImage.src = images[0].src;
    
    images.forEach((imgObj, idx) => {
      const img = document.createElement('img');
      img.src = imgObj.src;
      img.alt = imgObj.alt;
      img.className = 'gallery-thumb';
      if (idx === 0) img.classList.add('active');
      
      img.addEventListener('click', function() {
        document.querySelectorAll('.gallery-thumb').forEach(t => t.classList.remove('active'));
        this.classList.add('active');
        mainImage.src = this.src;
      });
      
      thumbsContainer.appendChild(img);
    });
  }
}

// ----------------------------------------------------
// 4A. PACK SIZE / BOX SELECTOR (FOR ROSE PETAL & ALMOND COOKIES)
// ----------------------------------------------------
function initPackSizeSelector() {
  const container = document.getElementById('product-pack-size-selector-box');
  const grid = document.getElementById('pack-size-cards-grid');
  if (!container || !grid) return;

  const boxOptions = COOKIE_BOX_OPTIONS[currentProduct.id];
  if (!boxOptions || boxOptions.length === 0) {
    container.style.display = 'none';
    return;
  }

  container.style.display = 'block';
  if (currentProduct.id === 'rose') {
    container.classList.add('rose-theme');
    container.classList.remove('almond-theme', 'orange-theme', 'oats-theme');
  } else if (currentProduct.id === 'orange') {
    container.classList.add('orange-theme');
    container.classList.remove('rose-theme', 'almond-theme', 'oats-theme');
  } else if (currentProduct.id === 'oatsnuts') {
    container.classList.add('oats-theme');
    container.classList.remove('rose-theme', 'almond-theme', 'orange-theme');
  } else {
    container.classList.add('almond-theme');
    container.classList.remove('rose-theme', 'orange-theme', 'oats-theme');
  }

  selectedBoxOption = boxOptions.find(o => o.default) || boxOptions[0];
  currentProduct.price = selectedBoxOption.price;

  const priceValEl = document.getElementById('p-price');
  if (priceValEl) priceValEl.textContent = selectedBoxOption.price;

  const priceUnitEl = document.querySelector('.p-price-card .price-unit');
  if (priceUnitEl) priceUnitEl.textContent = selectedBoxOption.unit;

  grid.innerHTML = boxOptions.map(opt => `
    <div class="pack-size-card ${opt.id === selectedBoxOption.id ? 'active' : ''}" data-pack-id="${opt.id}">
      <div class="pack-img-wrapper">
        <img src="${opt.img}" alt="${opt.name}" class="pack-card-img" />
        <button type="button" class="btn-pkg-zoom" data-box-preview="${opt.id}" title="Click to view full box photo">🔍 View Box</button>
      </div>
      <span class="pack-card-name">${opt.name}</span>
      <span class="pack-card-count">${opt.countLabel}</span>
      <span class="pack-card-price">₹${opt.price}</span>
    </div>
  `).join('');

  grid.querySelectorAll('.pack-size-card').forEach(card => {
    card.addEventListener('click', (e) => {
      if (e.target.closest('[data-box-preview]')) return;
      const packId = card.getAttribute('data-pack-id');
      const found = boxOptions.find(o => o.id === packId);
      if (!found) return;

      selectedBoxOption = found;
      currentProduct.price = found.price;

      grid.querySelectorAll('.pack-size-card').forEach(c => c.classList.remove('active'));
      card.classList.add('active');

      // Update unit price in hero card
      if (priceValEl) priceValEl.textContent = found.price;
      if (priceUnitEl) priceUnitEl.textContent = found.unit;

      updatePriceDisplay();
    });
  });

  // Attach lightbox preview to newly rendered pack zoom buttons
  grid.querySelectorAll('[data-box-preview]').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      const previewKey = btn.getAttribute('data-box-preview');
      openProductBoxLightbox(previewKey);
    });
  });
}

function updatePriceDisplay() {
  let boxExtra = 0;
  if (selectedPackaging === 'classic') boxExtra = 15;
  else if (selectedPackaging === 'lush') boxExtra = 130;

  const boxOptions = COOKIE_BOX_OPTIONS[currentProduct.id];
  const basePrice = (boxOptions && selectedBoxOption) ? selectedBoxOption.price : (currentProduct.price || 160);
  const totalUnit = basePrice + boxExtra;
  const btnTotal = document.getElementById('p-btn-total-price');
  if (btnTotal) btnTotal.textContent = `₹${totalUnit * selectedQuantity}`;

  const deselectContainer = document.getElementById('pkg-deselect-container');
  if (deselectContainer) {
    deselectContainer.style.display = (selectedPackaging !== 'none') ? 'block' : 'none';
  }
}

// ----------------------------------------------------
// 4B. PACKAGING GIFT BOX SELECTOR (OPTIONAL & DE-SELECTABLE)
// ----------------------------------------------------
function openProductBoxLightbox(boxKey) {
  const modal = document.getElementById('product-box-lightbox-modal') || document.getElementById('packaging-lightbox-modal') || document.getElementById('box-image-lightbox-modal');
  const img = document.getElementById('pkg-lightbox-img') || document.getElementById('lightbox-box-img');
  const title = document.getElementById('pkg-lightbox-title') || document.getElementById('lightbox-box-title');
  const desc = document.getElementById('pkg-lightbox-desc') || document.getElementById('lightbox-box-desc');
  if (!modal || !img) return;

  if (boxKey === 'snack_2pcs' || boxKey === 'rose_snack_2pcs') {
    img.src = '/rose-box-2pcs.jpg';
    img.alt = 'Rose Petal Cookies - Snack Pack (Up to 2 Cookies)';
    if (title) title.textContent = 'Rose Petal Cookies — Snack Pack (Up to 2 Cookies)';
    if (desc) desc.textContent = 'Compact pocket-sized pink packaging designed for fresh tea-time indulgence. Holds up to 2 freshly baked Rose Petal Cookies.';
  } else if (boxKey === 'classic_8pcs' || boxKey === 'rose_classic_8pcs') {
    img.src = '/rose-box-8pcs.jpg';
    img.alt = 'Rose Petal Cookies - Classic Box (Up to 8 Cookies)';
    if (title) title.textContent = 'Rose Petal Cookies — Classic Box (Up to 8 Cookies)';
    if (desc) desc.textContent = 'Standard authentic bakery box with signature rose artwork and nutritional facts. Holds up to 8 freshly baked Rose Petal Cookies.';
  } else if (boxKey === 'family_12pcs' || boxKey === 'rose_family_12pcs') {
    img.src = '/rose-box-12pcs.png?v=2';
    img.alt = 'Rose Petal Cookies - Family Pack (Up to 12 Cookies · 300g)';
    if (title) title.textContent = 'Rose Petal Cookies — Family Pack (Up to 12 Cookies · 300g)';
    if (desc) desc.textContent = 'Large rectangular party box (Net Weight: 300g) with protective seals. Holds up to 12 freshly baked Rose Petal Cookies.';
  } else if (boxKey === 'almond_snack_2pcs') {
    img.src = '/almond-box-2pcs.png?v=2';
    img.alt = 'Almond Cookies - Snack Pack (Up to 2 Cookies)';
    if (title) title.textContent = 'Almond Cookies — Snack Pack (Up to 2 Cookies)';
    if (desc) desc.textContent = 'Pocket snack pack with rich roasted almonds artwork, source of dietary fiber. Holds up to 2 freshly baked almond cookies.';
  } else if (boxKey === 'almond_classic_8pcs') {
    img.src = '/almond-box-8pcs.jpg';
    img.alt = 'Almond Cookies - Classic Box (Up to 8 Cookies)';
    if (title) title.textContent = 'Almond Cookies — Classic Box (Up to 8 Cookies)';
    if (desc) desc.textContent = 'Standard authentic bakery box with crunchy almond meets soft butter guarantee (no margarine). Holds up to 8 freshly baked almond cookies.';
  } else if (boxKey === 'almond_family_12pcs') {
    img.src = '/almond-box-12pcs.png?v=2';
    img.alt = 'Almond Cookies - Family Pack (Up to 12 Cookies · 300g)';
    if (title) title.textContent = 'Almond Cookies — Family Pack (Up to 12 Cookies · 300g)';
    if (desc) desc.textContent = 'Large festive party box with genuine cow butter & roasted almond recipe. Holds up to 12 freshly baked almond cookies.';
  } else if (boxKey === 'orange_snack_2pcs') {
    img.src = '/orange-box-2pcs.jpg';
    img.alt = 'Orange Peel Cookies - Snack Pack (Up to 2 Cookies)';
    if (title) title.textContent = 'Orange Peel Cookies — Snack Pack (Up to 2 Cookies)';
    if (desc) desc.textContent = 'Pocket snack pack with soft & chewy cookies made with sun-ripened orange peel and Vitamin C. Holds up to 2 freshly baked cookies.';
  } else if (boxKey === 'orange_classic_8pcs') {
    img.src = '/orange-box-8pcs.jpg';
    img.alt = 'Orange Peel Cookies - Classic Box (Up to 8 Cookies)';
    if (title) title.textContent = 'Orange Peel Cookies — Classic Box (Up to 8 Cookies)';
    if (desc) desc.textContent = 'Standard authentic bakery box crafted with the zest of real orange peel (No Margarine) and Vitamin C. Holds up to 8 freshly baked cookies.';
  } else if (boxKey === 'oatsnuts_snack_2pcs') {
    img.src = '/oats-box-2pcs.jpg';
    img.alt = 'Oats & Nuts Cookies - Snack Pack (Up to 2 Cookies)';
    if (title) title.textContent = 'Oats & Nuts Cookies — Snack Pack (Up to 2 Cookies)';
    if (desc) desc.textContent = 'Pocket snack pack featuring superhero cookie mascot — naturally nut powered immunity booster with rolled oats and pista-elaichi.';
  } else if (boxKey === 'oatsnuts_classic_8pcs') {
    img.src = '/oats-box-8pcs.jpg';
    img.alt = 'Oats & Nuts Cookies - Classic Box (Up to 8 Cookies)';
    if (title) title.textContent = 'Oats & Nuts Cookies — Classic Box (Up to 8 Cookies)';
    if (desc) desc.textContent = 'Standard authentic bakery box with delightfully flavourful pista-elaichi combo, immunity booster goodness, and zero margarine.';
  } else if (boxKey === 'oatsnuts_family_12pcs') {
    img.src = '/oats-box-12pcs.jpg';
    img.alt = 'Oats & Nuts Cookies - Family Pack (Up to 12 Cookies · 300g)';
    if (title) title.textContent = 'Oats & Nuts Cookies — Family Pack (Up to 12 Cookies · 300g)';
    if (desc) desc.textContent = 'Large luxury family pack (Net Weight: 300g) baked with nutrient-rich rolled oats, California walnuts, and apiary raw honey.';
  } else if (boxKey === 'lush') {
    img.src = '/box-lush.jpg';
    img.alt = 'Lush Luxury Box';
    if (title) title.textContent = 'Lush Luxury Box (+₹130 extra)';
    if (desc) desc.textContent = 'Exquisite blush floral keepsake gift box with gold-foil accents. Fits 4 artisanal cookies and includes a gourmet pouch of California roasted dry fruits.';
  } else {
    img.src = '/box-classic.jpg';
    img.alt = 'Signature Treat Box';
    if (title) title.textContent = 'Signature Treat Box (+₹15 extra)';
    if (desc) desc.textContent = 'Artisanal gable handle box in signature orange & cream design with secure easy-carry fold. Holds up to 10 fresh bakery treats.';
  }

  modal.classList.add('open');
}

function initPackagingSelector() {
  const classicCard = document.getElementById('modal-pkg-classic');
  const lushCard = document.getElementById('modal-pkg-lush');
  const warningMsg = document.getElementById('modal-pkg-warning');
  const deselectContainer = document.getElementById('modal-pkg-deselect-container');
  const btnDeselect = document.getElementById('btn-modal-deselect-box');
  const packagingGrid = document.querySelector('.packaging-cards-grid');

  // If viewing a muffin, completely remove the Lush Luxury Box option
  if (currentProduct.type === 'muffin') {
    if (lushCard) lushCard.style.display = 'none';
    if (packagingGrid) {
      packagingGrid.style.gridTemplateColumns = '1fr';
      packagingGrid.style.maxWidth = '320px';
    }
  } else {
    if (lushCard) lushCard.style.display = 'flex';
    if (packagingGrid) {
      packagingGrid.style.gridTemplateColumns = '1fr 1fr';
      packagingGrid.style.maxWidth = 'none';
    }
  }

  function deselectAllBoxes() {
    selectedPackaging = 'none';
    classicCard?.classList.remove('active');
    lushCard?.classList.remove('active');
    if (warningMsg) warningMsg.style.display = 'none';
    updatePriceDisplay();
  }

  function closeProductBoxLightbox() {
    const modal = document.getElementById('product-box-lightbox-modal');
    if (modal) modal.classList.remove('open');
  }

  document.getElementById('btn-close-pkg-lightbox')?.addEventListener('click', closeProductBoxLightbox);
  const pkgLightboxModal = document.getElementById('product-box-lightbox-modal');
  pkgLightboxModal?.addEventListener('click', (e) => {
    if (e.target === pkgLightboxModal) closeProductBoxLightbox();
  });
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      closeProductBoxLightbox();
      closeCartDrawer();
      const shipModal = document.getElementById('shipping-details-modal');
      if (shipModal) shipModal.style.display = 'none';
    }
  });

  // Delegated click handler for any box preview button across the page
  document.addEventListener('click', (e) => {
    const previewBtn = e.target.closest('[data-box-preview]');
    if (previewBtn) {
      e.preventDefault();
      e.stopPropagation();
      const boxKey = previewBtn.getAttribute('data-box-preview');
      openProductBoxLightbox(boxKey);
    }
  });

  classicCard?.addEventListener('click', (e) => {
    if (e.target.closest('[data-box-preview]')) return;
    if (selectedPackaging === 'classic') {
      deselectAllBoxes();
      return;
    }
    selectedPackaging = 'classic';
    classicCard.classList.add('active');
    lushCard?.classList.remove('active');
    if (warningMsg) warningMsg.style.display = 'none';
    updatePriceDisplay();
  });

  lushCard?.addEventListener('click', (e) => {
    if (e.target.closest('[data-box-preview]')) return;
    if (selectedPackaging === 'lush') {
      deselectAllBoxes();
      return;
    }
    if (currentProduct.type === 'muffin') {
      if (warningMsg) {
        warningMsg.innerHTML = `<span>⚠️ Muffins can't fit in this box, select another box.</span>`;
        warningMsg.style.display = 'block';
      } else {
        alert("Muffins can't fit in this box, select another box.");
      }
      return;
    }
    selectedPackaging = 'lush';
    lushCard.classList.add('active');
    classicCard?.classList.remove('active');
    if (warningMsg) warningMsg.style.display = 'none';
    updatePriceDisplay();
  });

  btnDeselect?.addEventListener('click', (e) => {
    e.preventDefault();
    deselectAllBoxes();
  });

  deselectAllBoxes();
}

// ----------------------------------------------------
// 5. QUANTITY SELECTOR & CART SYSTEM INTEGRATION
// ----------------------------------------------------
function initCartSystem() {
  // Quantity Buttons
  const btnMinus = document.getElementById('p-qty-minus');
  const btnPlus = document.getElementById('p-qty-plus');
  const qtyDisplay = document.getElementById('p-qty');
  const btnTotal = document.getElementById('p-btn-total-price');

  if (btnMinus && btnPlus && qtyDisplay) {
    btnMinus.addEventListener('click', () => {
      if (selectedQuantity > 1) {
        selectedQuantity--;
        qtyDisplay.textContent = selectedQuantity;
        const boxExtra = selectedPackaging === 'lush' ? 130 : 15;
        if (btnTotal) btnTotal.textContent = `₹${(currentProduct.price + boxExtra) * selectedQuantity}`;
      }
    });

    btnPlus.addEventListener('click', () => {
      selectedQuantity++;
      qtyDisplay.textContent = selectedQuantity;
      const boxExtra = selectedPackaging === 'lush' ? 130 : 15;
      if (btnTotal) btnTotal.textContent = `₹${(currentProduct.price + boxExtra) * selectedQuantity}`;
    });
  }

  // Add to Cart Button
  const btnAddCart = document.getElementById('btn-add-cart-main');
  if (btnAddCart) {
    btnAddCart.addEventListener('click', () => {
      try { Analytics.trackAddToCart(currentProduct, selectedQuantity); } catch (e) {}
      addToCart(currentProduct, selectedQuantity);
      openCartDrawer();
    });
  }

  // Cart Drawer Elements
  const btnCartHeader = document.getElementById('btn-cart');
  const btnCartClose = document.getElementById('btn-cart-close');
  const drawerBackdrop = document.getElementById('cart-drawer-backdrop');

  if (btnCartHeader) btnCartHeader.addEventListener('click', openCartDrawer);
  if (btnCartClose) btnCartClose.addEventListener('click', closeCartDrawer);
  if (drawerBackdrop) drawerBackdrop.addEventListener('click', closeCartDrawer);

  // Load Saved Cart from localStorage
  loadCartFromStorage();

  window.addEventListener('storage', (e) => {
    if (e.key === 'ming_morsels_cart') {
      loadCartFromStorage();
      updateCartBadge();
    }
  });

  window.addEventListener('pageshow', () => {
    loadCartFromStorage();
    updateCartBadge();
  });
}

const PRODUCT_NAMES = {
  almond: 'Almond Cookies',
  rose: 'Rose Petal Cookies',
  oatsnuts: 'Oats Nuts Cookies',
  orange: 'Orange Peel Cookies',
  walnut: 'Walnut Cookies',
  walnut_sf: 'Sugar-Free Walnut Cookies',
  strawberry: 'Strawberry Muffins',
  pineapple: 'Pineapple Muffins',
  butterscotch: 'Butterscotch Muffins',
  choco: 'Choco Muffins'
};

const PRODUCT_PRICES = {
  almond: 180, rose: 190, oatsnuts: 170, orange: 185, walnut: 210, walnut_sf: 220,
  strawberry: 140, pineapple: 145, butterscotch: 150, choco: 155
};

function loadCartFromStorage() {
  try {
    const saved = localStorage.getItem('ming_morsels_cart');
    const rawList = saved ? JSON.parse(saved) : [];
    if (Array.isArray(rawList)) {
      cart = rawList.map(item => {
        if (!item || typeof item !== 'object') return null;
        const key = String(item.id || item.key || '').trim();
        if (!key) return null;
        const qty = Math.max(1, parseInt(item.quantity ?? item.qty ?? 1, 10) || 1);
        const name = item.name || item.customName || PRODUCT_NAMES[key] || 'Artisanal Cookie Box';
        const price = Number(item.price || item.customPrice || PRODUCT_PRICES[key] || 180);
        return {
          ...item,
          id: key,
          name: name,
          price: isNaN(price) || price <= 0 ? 180 : price,
          quantity: qty,
          qty: qty
        };
      }).filter(Boolean);
    } else {
      cart = [];
    }
  } catch (e) { cart = []; }
  updateCartBadge();
}

function addToCart(product, qty) {
  let boxExtra = 0;
  let boxName = 'Standard Brand Box';
  let boxImg = null;

  if (selectedPackaging === 'classic') {
    boxExtra = 15;
    boxName = 'Signature Treat Box (+₹15)';
    boxImg = '/box-classic.jpg';
  } else if (selectedPackaging === 'lush') {
    boxExtra = 130;
    boxName = 'Lush Luxury Box (+₹130)';
    boxImg = '/box-lush.jpg';
  }

  let cartItemId = product.id;
  let cartItemName = product.name;
  let cartItemImg = `/img-${product.id}.png`;
  let unitPrice = Number(product.price || 160);

  const boxOptions = COOKIE_BOX_OPTIONS[product.id];
  if (boxOptions && selectedBoxOption) {
    unitPrice = selectedBoxOption.price;
    cartItemId = selectedBoxOption.id;
    cartItemName = `${product.name} (${selectedBoxOption.name} - ${selectedBoxOption.countLabel})`;
    cartItemImg = selectedBoxOption.img;
  }

  if (selectedPackaging !== 'none') {
    cartItemId = `${cartItemId}_${selectedPackaging}`;
    cartItemName = `${cartItemName} + ${boxName}`;
  }

  unitPrice += boxExtra;

  cartStore.addItem({
    id: cartItemId,
    productId: product.id,
    name: cartItemName,
    price: unitPrice,
    quantity: qty,
    packaging: selectedPackaging !== 'none' ? boxName : 'Standard Packaging',
    image: cartItemImg,
    boxImage: boxImg
  });

  updateCartBadge();
}

function updateCartBadge() {
  const badge = document.getElementById('cart-count-badge');
  if (!badge) return;
  const totalItems = cartStore.getTotalCount();
  if (totalItems > 0) {
    badge.textContent = totalItems;
    badge.style.display = 'flex';
  } else {
    badge.style.display = 'none';
  }
}

function openCartDrawer() {
  const drawer = document.getElementById('cart-drawer');
  const backdrop = document.getElementById('cart-drawer-backdrop');
  if (drawer && backdrop) {
    renderCartDrawerBody();
    drawer.classList.add('active');
    backdrop.classList.add('active');
  }
}

function closeCartDrawer() {
  const drawer = document.getElementById('cart-drawer');
  const backdrop = document.getElementById('cart-drawer-backdrop');
  if (drawer && backdrop) {
    drawer.classList.remove('active');
    backdrop.classList.remove('active');
  }
}

function renderCartDrawerBody() {
  const body = document.getElementById('cart-drawer-body');
  const footer = document.getElementById('cart-drawer-footer');
  const subtotalEl = document.getElementById('cart-subtotal-price');
  const btnRazorpay = document.getElementById('btn-cart-razorpay');

  if (!body) return;

  const cart = cartStore.getItems();
  updateCartBadge();

  if (cart.length === 0) {
    body.innerHTML = `
      <div class="cart-empty-message">
        <span class="cart-empty-icon">🍪</span>
        <p>Your basket is currently empty.</p>
        <a href="/#products" class="btn-card-action">Explore Flavours</a>
      </div>
    `;
    if (footer) footer.style.display = 'none';
    return;
  }

  const PRODUCT_IMAGE_MAP = {
    almond: '/img-almond.png?v=2',
    rose: '/img-rose.png?v=2',
    oatsnuts: '/img-oats.png?v=2',
    orange: '/img-orange.png?v=2',
    walnut: '/img-walnut.png?v=2',
    walnut_sf: '/img-walnut-sf.png?v=2',
    strawberry: '/img-strawberry.png?v=2',
    pineapple: '/img-pineapple.png?v=2',
    butterscotch: '/img-butterscotch.png?v=2',
    choco: '/img-choco.png?v=2'
  };

  let subtotal = 0;
  body.innerHTML = cart.map(item => {
    const itemTotal = (item.price || 180) * (item.quantity || 1);
    subtotal += itemTotal;
    const baseKey = String(item.productId || item.id || '').split('_')[0].toLowerCase();
    const imgSrc = item.image || item.img || PRODUCT_IMAGE_MAP[baseKey] || '/img-almond.png?v=2';

    return `
      <div class="cart-item-row" style="display: flex; align-items: center; justify-content: space-between; padding: 12px 0; border-bottom: 1px solid rgba(0,0,0,0.06);">
        <div style="display: flex; align-items: center; gap: 12px;">
          <div style="width: 48px; height: 48px; min-width: 48px; border-radius: 8px; overflow: hidden; background: #FFFDF9; border: 1px solid rgba(61, 32, 0, 0.10); display: flex; align-items: center; justify-content: center;">
            <img src="${imgSrc}" alt="${item.name}" style="width: 100%; height: 100%; object-fit: cover;" onerror="this.src='/img-almond.png?v=2'" />
          </div>
          <div class="cart-item-info">
            <h5 style="margin: 0 0 4px 0; font-size: 14px; font-weight: 600; color: #3D2000;">${item.name}</h5>
            <span class="cart-item-price" style="font-size: 13px; color: #705840;">₹${item.price} × ${item.quantity} = ₹${itemTotal}</span>
          </div>
        </div>
        <div class="cart-item-actions" style="display: flex; align-items: center; gap: 8px;">
          <button class="btn-cart-qty-sub" data-id="${item.id}" style="width: 24px; height: 24px; border-radius: 50%; border: 1px solid #ccc; background: #fff; cursor: pointer;">-</button>
          <span style="font-size: 14px; font-weight: 600;">${item.quantity}</span>
          <button class="btn-cart-qty-add" data-id="${item.id}" style="width: 24px; height: 24px; border-radius: 50%; border: 1px solid #ccc; background: #fff; cursor: pointer;">+</button>
        </div>
      </div>
    `;
  }).join('');

  const gst = Math.round(subtotal * 0.05);
  const grandTotal = subtotal + gst;

  if (subtotalEl) subtotalEl.textContent = `₹${subtotal}`;
  const pGstEl = document.getElementById('cart-p-gst-price');
  if (pGstEl) pGstEl.textContent = `+₹${gst}`;
  const pGrandEl = document.getElementById('cart-p-grand-total');
  if (pGrandEl) pGrandEl.textContent = `₹${grandTotal}`;

  if (footer) footer.style.display = 'block';

  if (btnRazorpay && !btnRazorpay.hasListener) {
    btnRazorpay.hasListener = true;
    btnRazorpay.addEventListener('click', startProductCheckout);
  }

  // Radio button logic for Checkout options
  const deliveryRadios = document.querySelectorAll('input[name="delivery_method"]');
  const paymentRadios = document.querySelectorAll('input[name="payment_method"]');
  const pickupHint = document.getElementById('pickup-address-hint');

  const updateCheckoutUI = () => {
    const isPickup = document.querySelector('input[name="delivery_method"]:checked')?.value === 'pickup';
    const isCOD = document.querySelector('input[name="payment_method"]:checked')?.value === 'cod';

    if (pickupHint) pickupHint.style.display = isPickup ? 'block' : 'none';
    if (btnRazorpay) {
      if (isCOD) {
        btnRazorpay.innerHTML = '<span>Place Order (Cash on Delivery)</span>';
      } else {
        btnRazorpay.innerHTML = '<span>Pay & Checkout (Razorpay / UPI / Cards)</span>';
      }
    }
  };

  deliveryRadios.forEach(radio => radio.addEventListener('change', updateCheckoutUI));
  paymentRadios.forEach(radio => radio.addEventListener('change', updateCheckoutUI));
  updateCheckoutUI(); // Initialize


  // Attach inline quantity listeners inside cart drawer
  body.querySelectorAll('.btn-cart-qty-sub').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.preventDefault();
      const id = btn.getAttribute('data-id') || e.target.getAttribute('data-id');
      if (id) {
        cartStore.decrementItem(id);
        renderCartDrawerBody();
        updateCartBadge();
      }
    });
  });

  body.querySelectorAll('.btn-cart-qty-add').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.preventDefault();
      const id = btn.getAttribute('data-id') || e.target.getAttribute('data-id');
      if (id) {
        cartStore.incrementItem(id);
        renderCartDrawerBody();
        updateCartBadge();
      }
    });
  });
}

async function ensureRazorpayScript() {
  if (window.Razorpay) return true;
  return new Promise((resolve) => {
    let script = Array.from(document.scripts).find(s => s.src && s.src.includes('razorpay'));
    if (!script) {
      script = document.createElement('script');
      script.src = 'https://checkout.razorpay.com/v1/checkout.js';
      document.head.appendChild(script);
    }
    script.onload = () => resolve(!!window.Razorpay);
    script.onerror = () => resolve(false);
    setTimeout(() => resolve(!!window.Razorpay), 1500);
  });
}

function getCustomerDetails() {
  const user = JSON.parse(localStorage.getItem('user_profile') || '{}');
  const phone = (localStorage.getItem('ming_morsels_phone') || user.phone || '').replace(/\D/g, '');
  const address = localStorage.getItem('ming_morsels_address') || user.address || '';
  const pincode = localStorage.getItem('ming_morsels_pincode') || user.pincode || '';
  const name = user.name || localStorage.getItem('ming_morsels_name') || '';
  const email = user.email || localStorage.getItem('ming_morsels_email') || '';

  return { name, phone, email, address, pincode };
}

function promptForShippingDetails(onComplete) {
  let modal = document.getElementById('shipping-details-modal');
  if (!modal) {
    modal = document.createElement('div');
    modal.id = 'shipping-details-modal';
    modal.style.cssText = 'position: fixed; top: 0; left: 0; width: 100vw; height: 100vh; background: rgba(0,0,0,0.7); backdrop-filter: blur(6px); display: flex; align-items: center; justify-content: center; z-index: 9999999; font-family: "Outfit", sans-serif;';
    modal.innerHTML = `
      <div class="modal-card" style="max-width: 460px; width: 90%; background: #FAF6F0; color: #3D2000; border-radius: 16px; padding: 24px; box-shadow: 0 20px 50px rgba(0,0,0,0.5); position: relative;">
        <button id="close-shipping-modal" style="position: absolute; top: 16px; right: 16px; background: none; border: none; font-size: 22px; cursor: pointer; color: #8C533E;">✕</button>
        <div style="display:flex; align-items:center; gap: 12px; margin-bottom: 12px;">
          <span style="font-size:28px;">📦</span>
          <div>
            <h3 style="font-family: 'Cormorant Garamond', serif; font-size: 24px; margin: 0; color: #3D2000; font-weight: 700;">How would you like to receive your order?</h3>
            <p style="font-size: 12.5px; color: #666; margin: 2px 0 0 0;">Choose between doorstep courier or self-pickup from store.</p>
          </div>
        </div>

        <!-- Delivery Mode Switcher -->
        <div style="display: flex; gap: 8px; margin-bottom: 14px; background: rgba(61,32,0,0.06); padding: 4px; border-radius: 10px;">
          <button type="button" id="p-tab-delivery-courier" style="flex: 1; padding: 9px 6px; border: none; border-radius: 8px; font-weight: 700; font-size: 12.5px; cursor: pointer; background: #C6960C; color: #FFF; transition: all 0.2s;">🚚 Doorstep Delivery</button>
          <button type="button" id="p-tab-delivery-pickup" style="flex: 1; padding: 9px 6px; border: none; border-radius: 8px; font-weight: 600; font-size: 12.5px; cursor: pointer; background: transparent; color: #705840; transition: all 0.2s;">🏪 Store Self-Pickup (₹0)</button>
        </div>

        <form id="shipping-details-form" style="display:flex; flex-direction:column; gap: 11px;">
          <div>
            <label style="font-size: 11px; font-weight: 700; text-transform: uppercase; color: #8C533E; display:block; margin-bottom:4px;">Full Name *</label>
            <input type="text" id="ship-modal-name" placeholder="e.g. Ananya Roy" required style="width: 100%; padding: 10px 12px; border: 1px solid #D5C4B3; border-radius: 8px; font-size: 14px; background: #FFF; color: #3D2000; box-sizing: border-box;" />
          </div>
          <div>
            <label style="font-size: 11px; font-weight: 700; text-transform: uppercase; color: #8C533E; display:block; margin-bottom:4px;">Mobile Phone (10 Digits for Updates &amp; Pickup OTP) *</label>
            <input type="tel" id="ship-modal-phone" placeholder="e.g. 9876543210" maxlength="10" required style="width: 100%; padding: 10px 12px; border: 1px solid #D5C4B3; border-radius: 8px; font-size: 14px; background: #FFF; color: #3D2000; box-sizing: border-box;" />
          </div>
          <div>
            <label style="font-size: 11px; font-weight: 700; text-transform: uppercase; color: #8C533E; display:block; margin-bottom:4px;">Email Address (for Order Confirmation &amp; Invoice) *</label>
            <input type="email" id="ship-modal-email" placeholder="e.g. yourname@gmail.com" required style="width: 100%; padding: 10px 12px; border: 1px solid #D5C4B3; border-radius: 8px; font-size: 14px; background: #FFF; color: #3D2000; box-sizing: border-box;" />
          </div>

          <!-- Doorstep Fields Container -->
          <div id="p-ship-courier-fields" style="display:flex; flex-direction:column; gap: 11px;">
            <div>
              <label style="font-size: 11px; font-weight: 700; text-transform: uppercase; color: #8C533E; display:block; margin-bottom:4px;">Delivery Address (House/Street/Area) *</label>
              <textarea id="ship-modal-address" rows="2" placeholder="e.g. Flat 4B, Rose Apartments, HSR Layout" style="width: 100%; padding: 10px 12px; border: 1px solid #D5C4B3; border-radius: 8px; font-size: 14px; background: #FFF; color: #3D2000; font-family: inherit; box-sizing: border-box;"></textarea>
            </div>
            <div>
              <label style="font-size: 11px; font-weight: 700; text-transform: uppercase; color: #8C533E; display:block; margin-bottom:4px;">Pincode *</label>
              <input type="text" id="ship-modal-pincode" placeholder="e.g. 560102" maxlength="6" style="width: 100%; padding: 10px 12px; border: 1px solid #D5C4B3; border-radius: 8px; font-size: 14px; background: #FFF; color: #3D2000; box-sizing: border-box;" />
            </div>
          </div>

          <!-- Store Pickup Info Box (Visible when Store Pickup is selected) -->
          <div id="p-ship-pickup-info" style="display: none; background: rgba(46, 107, 26, 0.08); border: 1px solid rgba(46, 107, 26, 0.25); border-radius: 10px; padding: 12px 14px;">
            <div style="font-weight: 700; color: #2E6B1A; font-size: 13.5px; display: flex; align-items: center; justify-content: space-between;">
              <span>🏪 Self-Pickup Location</span>
              <span style="font-size: 10.5px; background: #2E6B1A; color: #FFF; padding: 2px 7px; border-radius: 10px;">₹0 Delivery Fee</span>
            </div>
            <p style="margin: 6px 0 2px; color: #3D2000; font-size: 12.5px; line-height: 1.4;">
              <strong>Ming Morsels Experience Center</strong><br/>
            <div style="font-size: 11px; color: #705840; margin-top: 4px;">
              ⏱️ Fresh batch packaged & ready within 2–3 hours. You'll receive a pickup SMS with collection PIN.
            </div>
          </div>

          <!-- Live Price & Charges Breakdown Card -->
          <div id="p-checkout-charges-breakdown" style="background: #FFF; border: 1.5px solid #E8DFD5; border-radius: 12px; padding: 12px 14px; margin-top: 4px;">
            <div style="font-size: 11px; font-weight: 700; text-transform: uppercase; color: #8C533E; letter-spacing: 0.5px; margin-bottom: 8px; display: flex; align-items: center; justify-content: space-between;">
              <span>🧾 Bill Details &amp; Charges</span>
              <span style="font-size: 10px; color: #2E6B1A; font-weight: 600;">100% Transparent</span>
            </div>
            
            <div style="display: flex; flex-direction: column; gap: 6px; font-size: 13px; color: #5A4033;">
              <div style="display: flex; justify-content: space-between;">
                <span>Cookies Subtotal:</span>
                <strong id="p-chk-subtotal" style="color: #3D2000;">₹0</strong>
              </div>
              <div style="display: flex; justify-content: space-between;">
                <span>GST (5% Confectionery Tax):</span>
                <span id="p-chk-gst" style="color: #3D2000;">+₹0</span>
              </div>
              <div style="display: flex; justify-content: space-between; align-items: center;">
                <span>Delivery Charges:</span>
                <span id="p-chk-delivery" style="color: #3D2000; font-weight: 600;">+₹49</span>
              </div>
              <div style="height: 1px; background: rgba(61,32,0,0.1); margin: 4px 0;"></div>
              <div style="display: flex; justify-content: space-between; font-size: 15px; font-weight: 800; color: #2C1810;">
                <span>Total Amount to Pay:</span>
                <span id="p-chk-total" style="color: #C6960C;">₹0</span>
              </div>
            </div>
          </div>

          <button type="submit" style="margin-top: 8px; padding: 13px; background: linear-gradient(135deg, #C6960C 0%, #A67C00 100%); color: #FFF; border: none; border-radius: 10px; font-weight: 700; font-size: 15px; cursor: pointer; box-shadow: 0 4px 14px rgba(198,150,12,0.3); display: flex; align-items: center; justify-content: center; gap: 8px;">
            <span>Proceed to Secure Payment →</span>
          </button>
        </form>
      </div>
    `;
    document.body.appendChild(modal);
  } else {
    modal.style.display = 'flex';
    modal.classList.add('active');
  }

  let activeDeliveryMode = 'courier';
  const tabCourier = document.getElementById('p-tab-delivery-courier');
  const tabPickup = document.getElementById('p-tab-delivery-pickup');
  const courierFields = document.getElementById('p-ship-courier-fields');
  const pickupInfo = document.getElementById('p-ship-pickup-info');
  const pincodeInput = document.getElementById('ship-modal-pincode');

  const updatePPriceBreakdown = () => {
    const items = cartStore.getItems();
    const subtotal = items.reduce((sum, i) => sum + ((i.price || 180) * (i.quantity || 1)), 0);
    const gst = Math.round(subtotal * 0.05);

    const pin = pincodeInput ? pincodeInput.value.trim() : '';
    let deliveryFee = 49;
    let isFree = false;

    if (activeDeliveryMode === 'pickup') {
      deliveryFee = 0;
      isFree = true;
    } else {
      if (pin.startsWith('560')) {
        deliveryFee = subtotal >= 499 ? 0 : 49;
        isFree = subtotal >= 499;
      } else if (['561', '562', '563', '57', '58', '59'].some(p => pin.startsWith(p))) {
        deliveryFee = subtotal >= 599 ? 0 : 69;
        isFree = subtotal >= 599;
      } else if (['50', '51', '52', '53', '60', '61', '62', '63', '64', '67', '68', '69'].some(p => pin.startsWith(p))) {
        deliveryFee = subtotal >= 799 ? 0 : 89;
        isFree = subtotal >= 799;
      } else if (pin.length === 6) {
        deliveryFee = subtotal >= 899 ? 0 : 119;
        isFree = subtotal >= 899;
      } else {
        deliveryFee = subtotal >= 499 ? 0 : 49;
        isFree = subtotal >= 499;
      }
    }

    const total = subtotal + gst + deliveryFee;

    const elSubtotal = document.getElementById('p-chk-subtotal');
    const elGst = document.getElementById('p-chk-gst');
    const elDelivery = document.getElementById('p-chk-delivery');
    const elTotal = document.getElementById('p-chk-total');

    if (elSubtotal) elSubtotal.textContent = `₹${subtotal}`;
    if (elGst) elGst.textContent = `+₹${gst}`;
    if (elDelivery) {
      if (activeDeliveryMode === 'pickup') {
        elDelivery.innerHTML = '<span style="color:#2E6B1A;">₹0 (FREE Store Pickup)</span>';
      } else if (isFree) {
        elDelivery.innerHTML = '<span style="color:#2E6B1A;">FREE (Threshold met)</span>';
      } else {
        elDelivery.textContent = `+₹${deliveryFee}`;
      }
    }
    if (elTotal) elTotal.textContent = `₹${total}`;
  };

  pincodeInput?.addEventListener('input', updatePPriceBreakdown);

  function setDeliveryMode(mode) {
    activeDeliveryMode = mode;
    if (mode === 'pickup') {
      if (tabPickup) { tabPickup.style.background = '#C6960C'; tabPickup.style.color = '#FFF'; tabPickup.style.fontWeight = '700'; }
      if (tabCourier) { tabCourier.style.background = 'transparent'; tabCourier.style.color = '#705840'; tabCourier.style.fontWeight = '600'; }
      if (courierFields) courierFields.style.display = 'none';
      if (pickupInfo) pickupInfo.style.display = 'block';
    } else {
      if (tabCourier) { tabCourier.style.background = '#C6960C'; tabCourier.style.color = '#FFF'; tabCourier.style.fontWeight = '700'; }
      if (tabPickup) { tabPickup.style.background = 'transparent'; tabPickup.style.color = '#705840'; tabPickup.style.fontWeight = '600'; }
      if (courierFields) courierFields.style.display = 'flex';
      if (pickupInfo) pickupInfo.style.display = 'none';
    }
    updatePPriceBreakdown();
  }

  if (tabCourier) tabCourier.onclick = () => setDeliveryMode('courier');
  if (tabPickup) tabPickup.onclick = () => setDeliveryMode('pickup');

  const current = getCustomerDetails();
  if (current.name) document.getElementById('ship-modal-name').value = current.name;
  if (current.phone) document.getElementById('ship-modal-phone').value = current.phone;
  if (current.email) document.getElementById('ship-modal-email').value = current.email;
  if (current.address && !current.address.includes('Store Pickup:')) document.getElementById('ship-modal-address').value = current.address;
  if (current.pincode) document.getElementById('ship-modal-pincode').value = current.pincode;

  updatePPriceBreakdown();

  document.getElementById('close-shipping-modal').onclick = () => {
    modal.style.display = 'none';
  };

  document.getElementById('shipping-details-form').onsubmit = (e) => {
    e.preventDefault();
    const name = document.getElementById('ship-modal-name').value.trim();
    const phone = document.getElementById('ship-modal-phone').value.replace(/\D/g, '');
    const email = document.getElementById('ship-modal-email').value.trim();
    const payMethod = document.querySelector('input[name="p_checkout_pay_method"]:checked')?.value || 'PREPAID';

    if (phone.length < 10) {
      alert("Please enter a valid 10-digit mobile number for order updates & pickup notification.");
      return;
    }
    if (!email || !email.includes('@') || !email.includes('.')) {
      alert("Please enter a valid email address so we can send your order confirmation and invoice.");
      return;
    }

    let address = '';
    let pincode = '';

    if (activeDeliveryMode === 'pickup') {
      address = 'Store Pickup: Ming Morsels Experience Center, 12th Main Road, Indiranagar, Bengaluru - 560038';
      pincode = '560038';
    } else {
      address = document.getElementById('ship-modal-address').value.trim();
      pincode = document.getElementById('ship-modal-pincode').value.trim();

      if (!address) {
        alert("Please enter your doorstep delivery address.");
        return;
      }
      if (pincode.length < 6) {
        alert("Please enter a valid 6-digit destination pincode.");
        return;
      }
    }

    localStorage.setItem('ming_morsels_name', name);
    localStorage.setItem('ming_morsels_phone', phone);
    localStorage.setItem('ming_morsels_email', email);
    localStorage.setItem('ming_morsels_address', activeDeliveryMode === 'pickup' ? address : `${address}, Pincode: ${pincode}`);
    localStorage.setItem('ming_morsels_pincode', pincode);
    localStorage.setItem('ming_morsels_delivery_mode', activeDeliveryMode);
    localStorage.setItem('ming_morsels_pay_method', 'PREPAID');

    const userProfile = JSON.parse(localStorage.getItem('user_profile') || '{}');
    userProfile.name = name;
    userProfile.phone = phone;
    userProfile.email = email || userProfile.email || 'customer@mingmorsels.com';
    userProfile.address = activeDeliveryMode === 'pickup' ? address : `${address}, Pincode: ${pincode}`;
    userProfile.pincode = pincode;
    userProfile.delivery_mode = activeDeliveryMode;
    userProfile.payment_method = 'PREPAID';
    localStorage.setItem('user_profile', JSON.stringify(userProfile));

    modal.style.display = 'none';
    if (onComplete) {
      setTimeout(() => onComplete(), 50);
    }
  };
}

function startProductCheckout() {
  const items = cartStore.getItems();
  if (items.length === 0) {
    alert("Your basket is empty. Add some delicious cookies first!");
    return;
  }
  handleRazorpayProductCheckout();
}

async function handleRazorpayProductCheckout() {
  const items = cartStore.getItems();
  if (items.length === 0) {
    alert("Your basket is empty. Add some delicious cookies first!");
    return;
  }

  const details = getCustomerDetails();

  // Check if details are missing
  if (!details.address || details.address.length < 5 || !details.phone) {
    const modal = document.getElementById('address-required-modal');
    if (modal) {
      document.getElementById('req-shipping-phone').value = details.phone || '';
      document.getElementById('req-shipping-address').value = details.address || '';
      
      modal.style.display = 'flex';
      
      const saveBtn = document.getElementById('btn-save-address-continue');
      saveBtn.onclick = () => {
        const newPhone = document.getElementById('req-shipping-phone').value.trim();
        const newAddr = document.getElementById('req-shipping-address').value.trim();
        const newPin = document.getElementById('req-shipping-pincode').value.trim();
        
        if (newPhone.length < 10 || newAddr.length < 5 || newPin.length !== 6) {
          alert('Please enter a valid phone number, address, and 6-digit pin code.');
          return;
        }
        
        const fullAddr = `${newAddr}, Bengaluru, ${newPin}`;
        localStorage.setItem('ming_morsels_phone', newPhone);
        localStorage.setItem('ming_morsels_address', fullAddr);
        localStorage.setItem('ming_morsels_pincode', newPin);
        
        // Also update user profile if exists
        try {
          const userProfile = JSON.parse(localStorage.getItem('user_profile') || '{}');
          userProfile.phone = newPhone;
          userProfile.address = fullAddr;
          userProfile.pincode = newPin;
          localStorage.setItem('user_profile', JSON.stringify(userProfile));
        } catch(e) {}
        
        modal.style.display = 'none';
        handleRazorpayProductCheckout(); // Retry
      };
    } else {
      alert("Please update your delivery address in the dashboard before checking out.");
    }
    return;
  }

  const payBtn = document.getElementById('btn-cart-razorpay');
  const origBtnText = payBtn ? payBtn.innerHTML : '';
  if (payBtn) {
    payBtn.disabled = true;
    payBtn.innerHTML = '<span>⏳ Preparing Razorpay Gateway...</span>';
  }

  try {
    const COOKIE_PRICES = {
      almond: 180, rose: 190, oatsnuts: 170, orange: 185,
      walnut: 210, walnut_sf: 220,
      strawberry: 140, pineapple: 145, butterscotch: 150, choco: 155
    };

    const normalizedCart = items.map(item => {
      if (!item || typeof item !== 'object') return null;
      const key = String(item.id || item.productId || '').trim();
      const baseKey = key.split('_')[0].toLowerCase();
      const qty = Math.max(1, parseInt(item.quantity ?? 1, 10) || 1);
      const price = Number(item.price || COOKIE_PRICES[baseKey] || 180);
      return {
        id: key,
        name: item.name || 'Artisanal Cookie Box',
        price: isNaN(price) || price <= 0 ? 180 : price,
        quantity: qty
      };
    }).filter(Boolean);

    const subtotal = normalizedCart.reduce((sum, item) => sum + (item.price * item.quantity), 0);

    const apiUrl = '/api/payment/create-order';
    let res = await fetch(apiUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        items: normalizedCart,
        total_amount: subtotal,
        user_email: details.email || 'customer@mingmorsels.com',
        user_name: details.name || 'Guest Customer',
        shipping_address: document.querySelector('input[name="delivery_method"]:checked')?.value === 'pickup' ? 'Store Pickup: ' + details.address : details.address,
        payment_method: document.querySelector('input[name="payment_method"]:checked')?.value === 'cod' ? 'COD' : 'PREPAID'
      })
    });
    const text = await res.text();
    if (!text) {
      alert("⚠️ Empty response from server. Please ensure express server is running on port 5001.");
      if (payBtn) { payBtn.disabled = false; payBtn.innerHTML = origBtnText; }
      return;
    }
    const orderData = JSON.parse(text);
    if (!orderData.success) {
      alert("Failed to create order: " + (orderData.error || 'Server error'));
      if (payBtn) { payBtn.disabled = false; payBtn.innerHTML = origBtnText; }
      return;
    }

    // Direct redirect for COD
    if (orderData.is_cod) {
      cartStore.clear();
      updateCartBadge();
      renderCartDrawerBody();
      window.location.href = `/order-confirmation.html?order_id=${encodeURIComponent(orderData.order_id)}&payment_id=COD`;
      return;
    }


    const hasScript = await ensureRazorpayScript();
    if (!hasScript || !window.Razorpay) {
      alert("⚠️ Could not load Razorpay Payment Gateway. Please check your internet connection and try again.");
      if (payBtn) { payBtn.disabled = false; payBtn.innerHTML = origBtnText; }
      return;
    }

    const keyId = String(import.meta.env.VITE_RAZORPAY_KEY_ID || orderData.key_id || '').trim();

    const options = {
      key: keyId,
      amount: Number(orderData.amount),
      currency: "INR",
      name: "Ming Morsels",
      description: "Artisanal Confectionery - Fresh Daily Batch",
      image: "/logo.png?v=2",
      prefill: {
        name: details.name || 'Guest Customer',
        email: details.email || 'customer@mingmorsels.com',
        contact: details.phone || ''
      },
      theme: {
        color: "#C8960C"
      },
      handler: async function (response) {
        try {
          const verifyRes = await fetch('/api/payment/verify', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              order_id: orderData.order_id,
              razorpay_order_id: response.razorpay_order_id || orderData.razorpay_order_id,
              razorpay_payment_id: response.razorpay_payment_id,
              razorpay_signature: response.razorpay_signature
            })
          });

          const verifyData = await verifyRes.json();
          const shippedOrder = verifyData.order || {};
          const awb = shippedOrder.shipway_awb || `SW_IN_${(orderData.order_id || '').replace(/\D/g, '') || Date.now().toString().slice(-6)}`;

          cartStore.clear();
          updateCartBadge();
          renderCartDrawerBody();

          window.location.href = `/order-confirmation.html?order_id=${encodeURIComponent(orderData.order_id)}&payment_id=${encodeURIComponent(response.razorpay_payment_id || 'Completed')}`;
        } catch (err) {
          console.error('Payment verification error:', err);
          window.location.href = `/order-confirmation.html?order_id=${encodeURIComponent(orderData.order_id)}&payment_id=${encodeURIComponent(response.razorpay_payment_id || 'Completed')}`;
        }
      }
    };

    if (orderData.razorpay_order_id) {
      options.order_id = String(orderData.razorpay_order_id).trim();
    }

    if (window.Razorpay) {
      const rzp = new window.Razorpay(options);
      rzp.on('payment.failed', function (resp) {
        alert('❌ Payment Failed: ' + (resp.error?.description || 'Transaction declined by bank.'));
        if (payBtn) { payBtn.disabled = false; payBtn.innerHTML = origBtnText; }
      });
      if (payBtn) { payBtn.disabled = false; payBtn.innerHTML = origBtnText; }
      rzp.open();
    } else {
      alert('⚠️ Razorpay checkout could not load. Please check your internet connection.');
      if (payBtn) { payBtn.disabled = false; payBtn.innerHTML = origBtnText; }
    }
  } catch (e) {
    console.error('Checkout error:', e);
    if (payBtn) { payBtn.disabled = false; payBtn.innerHTML = origBtnText; }
    alert('Failed to process payment: ' + (e.message || 'Server error'));
  }
}

// ----------------------------------------------------
// 6. RELATED PRODUCTS GRID
// ----------------------------------------------------
function renderRelatedProducts() {
  const container = document.getElementById('p-related-grid');
  if (!container) return;

  const otherProducts = Object.values(PRODUCTS_DATA).filter(p => p.id !== currentProduct.id).slice(0, 4);

  container.innerHTML = otherProducts.map(prod => `
    <div class="product-card" onclick="window.location.href='/product.html?id=${prod.id}'" style="cursor: pointer;">
      <div class="product-badge">${prod.badges[0]}</div>
      <div class="card-icon-preview">${prod.type === 'muffin' ? '🧁' : '🍪'}</div>
      <h3 class="product-card-title">${prod.name}</h3>
      <p class="product-card-desc">${prod.tagline}</p>
      <div class="product-card-bottom">
        <span class="product-price">₹${prod.price} <small>/ box</small></span>
        <a href="/product.html?id=${prod.id}" class="btn-view-details">View Details</a>
      </div>
    </div>
  `).join('');
}

// ═══════════════════════════════════════════════════════════════
// LIVE SOCIAL PROOF PURCHASE NOTIFICATION POPUP (Bottom-Left)
// ═══════════════════════════════════════════════════════════════
function initLivePurchaseNotifications() {
  // 15 Users within Karnataka & Pan-India location distribution
  const customerProfiles = [
    // Karnataka & Bengaluru Locations
    { name: 'Sourav', location: 'Mysuru, KA' },
    { name: 'Preetham', location: 'Mangaluru, KA' },
    { name: 'Prashanth', location: 'Hubballi, KA' },
    { name: 'Sanika', location: 'Belagavi, KA' },
    { name: 'Tejas', location: 'Shivamogga, KA' },
    { name: 'Shreyas', location: 'Davanagere, KA' },
    { name: 'Varun', location: 'Tumakuru, KA' },
    { name: 'Manoj', location: 'Indiranagar, Bengaluru' },
    { name: 'Shashank', location: 'Koramangala, Bengaluru' },
    { name: 'Manjunath', location: 'Jayanagar, Bengaluru' },
    { name: 'Anitha', location: 'Whitefield, Bengaluru' },
    { name: 'Manjunath S.', location: 'HSR Layout, Bengaluru' },
    { name: 'Rajamma', location: 'Malleshwaram, Bengaluru' },
    { name: 'Rakshitha', location: 'Rajajinagar, Bengaluru' },
    { name: 'Bavitha', location: 'Nayanda Halli, Bengaluru' },

    // Pan-India Locations
    { name: 'Ramanna', location: 'Hyderabad' },
    { name: 'Krishnamurthy', location: 'Chennai' },
    { name: 'Purushotham', location: 'Mumbai' },
    { name: 'Ajay', location: 'Pune' },
    { name: 'Nitish', location: 'Delhi' },
    { name: 'Manasa', location: 'Kochi' },
    { name: 'Sanjana', location: 'Kolkata' }
  ];

  const products = [
    { name: 'Almond Cookies', img: '/img-almond.png?v=2' },
    { name: 'Rose Petal Cookies', img: '/img-rose.png?v=2' },
    { name: 'Oats & Nuts Cookies', img: '/img-oats.png?v=2' },
    { name: 'Orange Peel Cookies', img: '/img-orange.png?v=2' },
    { name: 'Strawberry Muffins', img: '/img-strawberry.png?v=2' },
    { name: 'Pineapple Muffins', img: '/img-pineapple.png?v=2' },
    { name: 'Butterscotch Muffins', img: '/img-butterscotch.png?v=2' },
    { name: 'Choco Muffins', img: '/img-choco.png?v=2' }
  ];

  const timesAgo = ['Just now', '1 min ago', '2 mins ago', '3 mins ago'];

  let profileIdx = Math.floor(Math.random() * customerProfiles.length);
  let prodIdx = Math.floor(Math.random() * products.length);

  let popupEl = document.getElementById('live-purchase-popup');
  if (!popupEl) {
    popupEl = document.createElement('div');
    popupEl.id = 'live-purchase-popup';
    popupEl.className = 'live-purchase-popup';
    popupEl.innerHTML = `
      <div class="live-purchase-accent"></div>
      <div class="live-purchase-img-wrap">
        <img id="live-purchase-img" src="/img-rose.png?v=2" alt="Product" />
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
    document.body.appendChild(popupEl);

    document.getElementById('live-purchase-close')?.addEventListener('click', () => {
      popupEl.classList.remove('show');
    });
  }

  function triggerPopup() {
    const profile = customerProfiles[profileIdx % customerProfiles.length];
    const prod = products[prodIdx % products.length];
    const timeAgo = timesAgo[Math.floor(Math.random() * timesAgo.length)];

    profileIdx++;
    prodIdx++;

    const nameEl = document.getElementById('live-purchase-name');
    const locEl  = document.getElementById('live-purchase-loc');
    const itemEl = document.getElementById('live-purchase-item');
    const imgEl  = document.getElementById('live-purchase-img');
    const timeEl = document.getElementById('live-purchase-time-text');

    if (nameEl) nameEl.textContent = profile.name;
    if (locEl)  locEl.textContent  = `from ${profile.location}`;
    if (itemEl) itemEl.textContent = prod.name;
    if (imgEl)  imgEl.src          = prod.img;
    if (timeEl) timeEl.textContent = `Verified Purchase · ${timeAgo}`;

    popupEl.classList.add('show');

    // Auto-hide popup after 7 seconds
    setTimeout(() => {
      popupEl.classList.remove('show');
    }, 7000);
  }

  // Initial popup preview 5 seconds after page load
  setTimeout(triggerPopup, 5000);

  // Every 3 minutes (180,000 ms) as specified by user
  setInterval(triggerPopup, 3 * 60 * 1000);
}

// ----------------------------------------------------
// 12. LIVE PINCODE DELIVERY ESTIMATOR
// ----------------------------------------------------
function initPincodeChecker() {
  const pinInput = document.getElementById('p-pincode-input');
  const btnCheck = document.getElementById('btn-check-pincode');
  const resultMsg = document.getElementById('pincode-result-msg');

  if (!pinInput || !btnCheck || !resultMsg) return;

  async function checkPin() {
    const pin = pinInput.value.trim().replace(/\D/g, '');
    if (pin.length !== 6) {
      resultMsg.style.display = 'block';
      resultMsg.style.color = '#B22222';
      resultMsg.textContent = '⚠️ Please enter a valid 6-digit Indian pincode.';
      return;
    }

    btnCheck.disabled = true;
    btnCheck.textContent = 'Checking...';

    try {
      const res = await fetch(`/api/pincode/check?pincode=${pin}`);
      const data = await res.json();

      resultMsg.style.display = 'block';
      if (data.serviceable) {
        resultMsg.style.color = '#2E6B1A';
        resultMsg.innerHTML = `
          <div style="background: rgba(46, 107, 26, 0.08); border: 1px solid rgba(46, 107, 26, 0.25); border-radius: 8px; padding: 10px 14px; margin-top: 8px;">
            <div style="font-weight: 700; color: #2E6B1A; font-size: 13.5px; display: flex; align-items: center; justify-content: space-between;">
              <span>📍 ${data.area || 'Pincode ' + pin}</span>
              <span style="font-size: 11px; background: #2E6B1A; color: #FFF; padding: 2px 8px; border-radius: 10px;">${data.badge || 'Shipway Verified'}</span>
            </div>
            <div style="font-size: 13px; color: #3D2000; margin-top: 5px;">
              Estimated Delivery: <strong>${data.estTime}</strong>
            </div>
            <div style="font-size: 12.5px; color: #8C533E; font-weight: 600; margin-top: 4px;">
              🚚 Shipping: ₹${data.deliveryFee ?? 49} <span style="font-weight: 400; color: #2E6B1A;">(Free on orders above ₹${data.freeDeliveryAbove ?? 499})</span>
            </div>
            <div style="font-size: 11.5px; color: #705840; margin-top: 3px;">
              Dispatched via <em>${data.courier || 'BlueDart Air Express (Shipway Partner)'}</em> • Fresh Batch Sealed
            </div>
          </div>
        `;
      } else {
        resultMsg.style.color = '#B22222';
        resultMsg.innerHTML = `<strong>❌ Unavailable:</strong> Delivery is currently unavailable for PIN code ${pin}.`;
      }
    } catch (e) {
      resultMsg.style.display = 'block';
      resultMsg.style.color = '#2E6B1A';
      resultMsg.innerHTML = `<strong>✅ Deliverable to ${pin}:</strong> Fresh artisanal batch ships via Shipway Air Express!`;
    } finally {
      btnCheck.disabled = false;
      btnCheck.textContent = 'Check';
    }
  }

  btnCheck.addEventListener('click', checkPin);
  pinInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      checkPin();
    }
  });
}
