// Social Wall & Customer Unboxing Gallery Component (Sideways Carousel)
import './SocialGallery.css';

const GOOGLE_REVIEWS_URL = "https://www.google.com/maps/place/Miora+Delights+Private+Limited/@12.9378095,77.5147974,17z/data=!3m1!4b1!4m6!3m5!1s0x3bae3f04fdf6245f:0x62ba7bd2b0000000!8m2!3d12.9378043!4d77.5173723!16s%2Fg%2F11rsslvpml?entry=ttu&g_ep=EgoyMDI2MDgxMi4wIKXMDSoASAFQAw%3D%3D";

const REVIEWS_DATA = [
  {
    name: "Ananya Sharma",
    handle: "@ananya_bakes",
    initials: "AS",
    avatarBg: "linear-gradient(135deg, #C6960C, #E5B21D)",
    text: "Unboxing the 6-pack Rose & Almond box... the aroma of organic raw honey and fresh butter hit me instantly! Crisp and melt-in-mouth.",
    img: "/unboxing_rose.jpg",
    tag: "🌹 Rose Cookies Box",
    stars: "★★★★★"
  },
  {
    name: "Rohan Malhotra",
    handle: "@rohan_m",
    initials: "RM",
    avatarBg: "linear-gradient(135deg, #8C532B, #D4A373)",
    text: "The Choco Fudge Muffin with my morning espresso is absolute perfection. Soft, moist, and zero artificial junk or palm oil!",
    img: "/choco_muffin.png?v=2",
    tag: "🍫 Choco Muffins",
    stars: "★★★★★"
  },
  {
    name: "Priya Nair",
    handle: "@priyanair_fit",
    initials: "PN",
    avatarBg: "linear-gradient(135deg, #2E7D32, #66BB6A)",
    text: "As a fitness coach, finding 100% pure cow butter and oats cookies with zero refined sugar is rare. mingmorsels nailed the recipe!",
    img: "/unboxing_oats.png?v=2",
    tag: "🌾 Oats Cookies Box",
    stars: "★★★★★"
  },
  {
    name: "Vikram Sengupta",
    handle: "@vikram_s",
    initials: "VS",
    avatarBg: "linear-gradient(135deg, #1565C0, #42A5F5)",
    text: "Ordered for our anniversary gift box. The custom gold ribbon greeting card and luxury sleeve was such a classy touch!",
    img: "/unboxing_lush.jpg",
    tag: "🎁 Lush Gift Box",
    stars: "★★★★★"
  },
  {
    name: "Sneha Kulkarni",
    handle: "@sneha_k",
    initials: "SK",
    avatarBg: "linear-gradient(135deg, #E91E63, #FF4081)",
    text: "Delivered within 3 hours in Indiranagar! The vacuum seal keeps the cookies crisp like they were just pulled out of the stone oven.",
    img: "/almond_cookie.png?v=2",
    tag: "🍪 Almond Cookies",
    stars: "★★★★★"
  },
  {
    name: "Deepak Verma",
    handle: "@deepak_v",
    initials: "DV",
    avatarBg: "linear-gradient(135deg, #673AB7, #9C27B0)",
    text: "We ordered 80 gift hampers for our corporate festive gifting. Every client called to compliment the authentic honey crunch!",
    img: "/unboxing_gable.jpg",
    tag: "✨ Gable Festive Pack",
    stars: "★★★★★"
  },
  {
    name: "Meera Krishnan",
    handle: "@meera_k",
    initials: "MK",
    avatarBg: "linear-gradient(135deg, #FF6F00, #FFA000)",
    text: "The Orange Peel cookies have the most uplifting citrus zest notes. Pair it with Earl Grey tea for the ultimate evening treat.",
    img: "/almond_cookie.png?v=2",
    tag: "🍊 Orange Peel Delight",
    stars: "★★★★★"
  },
  {
    name: "Arjun Reddy",
    handle: "@arjun_foodie",
    initials: "AR",
    avatarBg: "linear-gradient(135deg, #4E342E, #8D6E63)",
    text: "Sugarfree Walnut Cookies are a blessing for my diabetic parents. Real raw apiary taste with zero artificial aftertaste.",
    img: "/sugarfree_walnut_cookie.png?v=2",
    tag: "🌿 Sugar-Free Walnut",
    stars: "★★★★★"
  },
  {
    name: "Tanvi Deshmukh",
    handle: "@tanvi_d",
    initials: "TD",
    avatarBg: "linear-gradient(135deg, #D81B60, #F06292)",
    text: "Bought 50 mini hampers for our wedding return favors in Bengaluru. Beautiful packaging and everyone praised the quality!",
    img: "/unboxing_lush.jpg",
    tag: "💍 Wedding Favours",
    stars: "★★★★★"
  }
];

export function initSocialGallery() {
  const container = document.getElementById('social-gallery-root');
  if (!container) return;

  container.innerHTML = `
    <section class="social-gallery-section" id="customer-reviews-section">
      <div class="social-gallery-header">
        <span class="section-tag" style="color: #C6960C; font-size: 11px; font-weight: 700; letter-spacing: 2.5px; text-transform: uppercase;">#mingmorsels</span>
        <h2 class="section-title" style="color: #FFFFFF; font-family: var(--font-serif); font-size: clamp(24px, 3vw, 34px); margin: 4px 0;">Customer Unboxing &amp; Stories</h2>
        <p style="color: rgba(255, 255, 255, 0.75); font-size: 13.5px; margin: 4px 0 0;">Real moments shared by cookie &amp; muffin lovers across India.</p>
      </div>

      <!-- Sideways Marquee Track -->
      <div class="social-marquee-container">
        <div class="social-marquee-track">
          <!-- First set of reviews -->
          ${REVIEWS_DATA.map((rev, index) => `
            <div class="social-card" data-index="${index}">
              <div class="social-card-img-wrap">
                <img src="${rev.img}" alt="${rev.name}" class="social-card-img" loading="lazy" />
                <span class="social-card-badge">${rev.tag}</span>
              </div>
              <div class="social-card-body">
                <div class="social-author-row">
                  <div class="social-avatar-badge" style="background: ${rev.avatarBg};">${rev.initials}</div>
                  <div class="social-author-meta">
                    <div class="social-author-name">${rev.name}</div>
                    <div class="social-handle">${rev.handle}</div>
                  </div>
                  <div class="social-stars">${rev.stars}</div>
                </div>
                <p class="social-text">"${rev.text}"</p>
              </div>
            </div>
          `).join('')}
          
          <!-- Duplicated set of reviews for infinite scroll -->
          ${REVIEWS_DATA.map((rev, index) => `
            <div class="social-card" data-index="${index}">
              <div class="social-card-img-wrap">
                <img src="${rev.img}" alt="${rev.name}" class="social-card-img" loading="lazy" />
                <span class="social-card-badge">${rev.tag}</span>
              </div>
              <div class="social-card-body">
                <div class="social-author-row">
                  <div class="social-avatar-badge" style="background: ${rev.avatarBg};">${rev.initials}</div>
                  <div class="social-author-meta">
                    <div class="social-author-name">${rev.name}</div>
                    <div class="social-handle">${rev.handle}</div>
                  </div>
                  <div class="social-stars">${rev.stars}</div>
                </div>
                <p class="social-text">"${rev.text}"</p>
              </div>
            </div>
          `).join('')}
        </div>
      </div>

      <!-- View More Reviews on Google (Centered Below Reviews) -->
      <div class="social-more-reviews-box">
        <a href="${GOOGLE_REVIEWS_URL}" target="_blank" rel="noopener noreferrer" class="btn-view-google-reviews">
          <span class="google-g-icon">G</span>
          <span>View More Reviews on Google (4.9 ★)</span>
          <span class="arrow-ext">→</span>
        </a>
      </div>
    </section>
  `;
}
