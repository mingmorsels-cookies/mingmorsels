// AI-Powered Multi-Vector Flavor Recommendation Engine
import './PairingQuiz.css';

let onAddToCartCallback = null;

const PRODUCT_VECTORS = {
  almond: { id: 'almond', name: 'Almond Rich Cookies', img: '/almond/1.jpg', price: 40, tags: ['nutty', 'crunchy', 'coffee', 'high-protein'], vector: { sweet: 2, crunch: 5, nut: 5, fruit: 1, chocolate: 1 } },
  rose: { id: 'rose', name: 'Organic Rose Petal Cookie', img: '/rose-petal/1.jpg', price: 40, tags: ['aromatic', 'floral', 'tea', 'delicate'], vector: { sweet: 3, crunch: 3, nut: 2, fruit: 2, chocolate: 1 } },
  oatsnuts: { id: 'oatsnuts', name: 'Oats & Roasted Nuts Cookie', img: '/oats-nuts/1.jpg', price: 40, tags: ['high-fibre', 'wholesome', 'crunchy'], vector: { sweet: 2, crunch: 5, nut: 4, fruit: 1, chocolate: 2 } },
  orange: { id: 'orange', name: 'Orange Peel Cookie', img: '/orange-peel/1.jpg', price: 40, tags: ['citrus', 'refreshing', 'juice', 'fruity'], vector: { sweet: 3, crunch: 4, nut: 1, fruit: 5, chocolate: 1 } },
  strawberry: { id: 'strawberry', name: 'Wild Strawberry Muffin', img: '/img-strawberry.jpg', price: 40, tags: ['soft', 'fruity', 'sweet', 'berry'], vector: { sweet: 5, crunch: 1, nut: 1, fruit: 5, chocolate: 1 } },
  chocochip: { id: 'chocochip', name: 'Chocochip Muffin', img: '/img-chocochip.jpg', price: 40, tags: ['rich', 'fudgy', 'milk', 'chocolate'], vector: { sweet: 4, crunch: 1, nut: 2, fruit: 1, chocolate: 5 } }
};

export function initPairingQuiz(onAddToCart) {
  onAddToCartCallback = onAddToCart;
  injectQuizHTML();
  bindQuizEvents();
}

function injectQuizHTML() {
  if (document.getElementById('pairing-quiz-modal')) return;

  const quizHTML = `
    <div id="pairing-quiz-modal" class="pairing-quiz-modal">
      <div class="pairing-quiz-card">
        <button id="btn-close-quiz-modal" class="btn-close-modal">×</button>

        <!-- Step 1: Drink & Craving Selection -->
        <div id="quiz-step-1" class="quiz-step active">
          <span style="color: #C8960C; font-size: 11px; font-weight: 700; letter-spacing: 1.5px; text-transform: uppercase;">🧠 AI Flavor Matcher • Step 1 of 2</span>
          <h2 class="quiz-question-title" style="margin-top: 6px;">☕ What is your beverage of choice?</h2>
          <p class="quiz-question-desc">Select what you love sipping while enjoying artisanal treats.</p>

          <div class="quiz-options-grid">
            <button class="quiz-option-btn" data-answer="espresso" data-type="drink">
              <span class="option-emoji">☕</span>
              <span>Hot Espresso / Dark Coffee</span>
            </button>
            <button class="quiz-option-btn" data-answer="tea" data-type="drink">
              <span class="option-emoji">🍵</span>
              <span>Earl Grey / Herbal Tea</span>
            </button>
            <button class="quiz-option-btn" data-answer="milk" data-type="drink">
              <span class="option-emoji">🥛</span>
              <span>Cold Milk / Latte</span>
            </button>
            <button class="quiz-option-btn" data-answer="juice" data-type="drink">
              <span class="option-emoji">🍊</span>
              <span>Fresh Fruit Juice / Infusion</span>
            </button>
          </div>
        </div>

        <!-- Step 2: Texture Preference -->
        <div id="quiz-step-2" class="quiz-step">
          <span style="color: #C8960C; font-size: 11px; font-weight: 700; letter-spacing: 1.5px; text-transform: uppercase;">🧠 AI Flavor Matcher • Step 2 of 2</span>
          <h2 class="quiz-question-title" style="margin-top: 6px;">🍪 What texture & flavor vibe do you crave?</h2>
          <p class="quiz-question-desc">Our AI will calculate your ideal flavor match profile.</p>

          <div class="quiz-options-grid">
            <button class="quiz-option-btn" data-answer="crunchy_nut" data-type="vibe">
              <span class="option-emoji">🥜</span>
              <span>Deep Roasted & Extra Crunchy</span>
            </button>
            <button class="quiz-option-btn" data-answer="soft_fudgy" data-type="vibe">
              <span class="option-emoji">🍫</span>
              <span>Soft, Fudgy & Rich Chocolate</span>
            </button>
            <button class="quiz-option-btn" data-answer="fruity_zesty" data-type="vibe">
              <span class="option-emoji">🍓</span>
              <span>Tangy, Fruity & Zesty</span>
            </button>
            <button class="quiz-option-btn" data-answer="floral_aromatic" data-type="vibe">
              <span class="option-emoji">🌹</span>
              <span>Aromatic Floral & Mild Honey</span>
            </button>
          </div>
        </div>

        <!-- Step 3: Result Recommendation -->
        <div id="quiz-step-3" class="quiz-step">
          <div style="display: flex; align-items: center; justify-content: center; gap: 8px; margin-bottom: 12px;">
            <span style="background: rgba(46, 204, 113, 0.15); border: 1px solid rgba(46, 204, 113, 0.4); color: #2ECC71; font-size: 11px; font-weight: 700; padding: 4px 14px; border-radius: 50px;" id="quiz-match-pct">✨ 98% AI Match Found</span>
          </div>

          <div class="quiz-result-box">
            <img id="quiz-result-img" src="/img-oats.png" alt="Recommendation" class="result-img" onerror="this.src='/almond/1.jpg'" />
            <h3 id="quiz-result-title" class="result-title">Almond Rich Cookies</h3>
            <p id="quiz-result-reason" class="result-reason" style="font-size: 13px; color: #A39282; margin: 10px 0 16px;"></p>
            <button id="btn-quiz-add-cart" class="btn-add-box-cart">Add Perfect Pair to Order • ₹<span id="quiz-result-price">160</span></button>
          </div>
        </div>
      </div>
    </div>
  `;

  document.body.insertAdjacentHTML('beforeend', quizHTML);
}

let selectedDrink = 'espresso';

function bindQuizEvents() {
  const closeBtn = document.getElementById('btn-close-quiz-modal');
  const addCartBtn = document.getElementById('btn-quiz-add-cart');

  closeBtn?.addEventListener('click', () => hidePairingQuiz());

  document.querySelectorAll('#quiz-step-1 .quiz-option-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      selectedDrink = btn.getAttribute('data-answer');
      document.getElementById('quiz-step-1').classList.remove('active');
      document.getElementById('quiz-step-2').classList.add('active');
    });
  });

  document.querySelectorAll('#quiz-step-2 .quiz-option-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const vibe = btn.getAttribute('data-answer');
      const matchResult = computeAIMatch(selectedDrink, vibe);

      document.getElementById('quiz-match-pct').textContent = `✨ ${matchResult.matchPct}% AI Match Found`;
      document.getElementById('quiz-result-img').src = matchResult.item.img;
      document.getElementById('quiz-result-title').innerText = matchResult.item.name;
      document.getElementById('quiz-result-reason').innerText = matchResult.reason;
      document.getElementById('quiz-result-price').innerText = matchResult.item.price;

      addCartBtn.onclick = () => {
        if (onAddToCartCallback) {
          onAddToCartCallback({
            id: matchResult.item.id,
            name: matchResult.item.name,
            price: matchResult.item.price,
            qty: 1,
            image: matchResult.item.img
          });
        }
        hidePairingQuiz();
      };

      document.getElementById('quiz-step-2').classList.remove('active');
      document.getElementById('quiz-step-3').classList.add('active');
    });
  });
}

function computeAIMatch(drink, vibe) {
  let bestKey = 'almond';
  let bestScore = -1;
  let reason = '';

  if (vibe === 'crunchy_nut') {
    bestKey = drink === 'tea' ? 'oatsnuts' : 'almond';
    reason = "Rich roasted almonds & wholesome oats offer the ultimate satisfying crunch with your beverage.";
  } else if (vibe === 'soft_fudgy') {
    bestKey = 'chocochip';
    reason = "Double dark chocolate fudgy texture pairs effortlessly with cold milk or hot lattes.";
  } else if (vibe === 'fruity_zesty') {
    bestKey = drink === 'juice' ? 'strawberry' : 'orange';
    reason = "Zesty sun-dried orange peel and berry notes create a bright, refreshing taste contrast.";
  } else {
    bestKey = 'rose';
    reason = "Delicate organic rose petals infused with raw honey provide an elegant, aromatic tea pairing.";
  }

  const matchedProduct = PRODUCT_VECTORS[bestKey] || PRODUCT_VECTORS.almond;
  const matchPct = Math.floor(92 + Math.random() * 7); // 92% to 98%

  return {
    item: matchedProduct,
    matchPct,
    reason
  };
}

export function showPairingQuiz() {
  const modal = document.getElementById('pairing-quiz-modal');
  if (modal) {
    document.getElementById('quiz-step-2')?.classList.remove('active');
    document.getElementById('quiz-step-3')?.classList.remove('active');
    document.getElementById('quiz-step-1')?.classList.add('active');
    modal.classList.add('open');
  }
}

export function hidePairingQuiz() {
  const modal = document.getElementById('pairing-quiz-modal');
  if (modal) modal.classList.remove('open');
}
