
        const customLocalStorage = (function () {
            try {
                const testKey = '__storage_test__';
                window.localStorage.setItem(testKey, testKey);
                window.localStorage.removeItem(testKey);
                return {
                    getItem: function (key) {
                        try { return window.localStorage.getItem(key); } catch (e) { return null; }
                    },
                    setItem: function (key, value) {
                        try { window.localStorage.setItem(key, value); } catch (e) { console.warn("localStorage.setItem failed:", e); }
                    },
                    removeItem: function (key) {
                        try { window.localStorage.removeItem(key); } catch (e) { console.warn("localStorage.removeItem failed:", e); }
                    },
                    clear: function () {
                        try { window.localStorage.clear(); } catch (e) { console.warn("localStorage.clear failed:", e); }
                    },
                    key: function (i) {
                        try { return window.localStorage.key(i); } catch (e) { return null; }
                    },
                    get length() {
                        try { return window.localStorage.length; } catch (e) { return 0; }
                    }
                };
            } catch (e) {
                console.warn('localStorage is not available or blocked. Falling back to in-memory storage.', e);
                const mem = {};
                return {
                    getItem: function (key) { return mem[key] !== undefined ? mem[key] : null; },
                    setItem: function (key, value) { mem[key] = String(value); },
                    removeItem: function (key) { delete mem[key]; },
                    clear: function () { for (let k in mem) delete mem[k]; },
                    key: function (i) { return Object.keys(mem)[i] || null; },
                    get length() { return Object.keys(mem).length; }
                };
            }
        })();

        let allVoices = [];
        let userName = null;
        let voiceEnabled = false;
        let recognition = null;
        let isListening = false;
        let _speechKeepAlive = null;
        let _speechSessionId = 0;
        const MALE_NAMES_EXCLUDE = ["male", " man", "guy", "boy", "david", "mark", "george", "ravi", "daniel", "alex", "fred", "albert", "bruce", "ralph", "harold", "valluvar", "rishi", "girish", "anil"];
        function initVoices() {
            if (window.speechSynthesis) {
                allVoices = window.speechSynthesis.getVoices();
            }
        }
        initVoices();
        if (window.speechSynthesis) {
            window.speechSynthesis.onvoiceschanged = initVoices;
        }

        function setTheme(theme) {
            document.documentElement.setAttribute('data-theme', theme);
            document.getElementById('btnLight').classList.toggle('active', theme === 'light');
            document.getElementById('btnDark').classList.toggle('active', theme === 'dark');
            customLocalStorage.setItem('mm-theme', theme);
        }

        (function () {
            const saved = customLocalStorage.getItem('mm-theme') || 'light';
            setTheme(saved);
        })();

        const LANGS = {
            en: { flag: '🇬🇧', code: 'EN', dir: 'ltr' }, hi: { flag: '🇮🇳', code: 'HI', dir: 'ltr' },
            kn: { flag: '🇮🇳', code: 'KN', dir: 'ltr' }, ta: { flag: '🇮🇳', code: 'TA', dir: 'ltr' },
            te: { flag: '🇮🇳', code: 'TE', dir: 'ltr' }, ar: { flag: '🇸🇦', code: 'AR', dir: 'rtl' }
        };

        let currentLang = 'en';

        const TRANSLATIONS = {
            en: { 
                welcome: `Welcome to <strong>mingmorsels</strong> — where handcrafted luxury meets pure, wholesome baking! 🍪✨<br><br>I'm your personal <strong>Cookie Sommelier</strong>. I'm here to help you discover our artisan cookies and soft-baked muffins made with 100% pure cow butter and natural plant-derived Stevia — completely free from palm oil, zero margarine, and zero artificial preservatives.<br><br><em>Ask me for flavour recommendations, ingredients, custom gift boxes, or pick a mood above to match your vibe!</em>`, 
                placeholder: "Ask about flavours, ingredients, box sizes, nutrition...", 
                moodLabel: "How are you feeling today? Let our Sommelier suggest the perfect cookie ✦", 
                footer: "✦ 100% Pure Butter · Zero Palm Oil · Zero Margarine · Plant Stevia ✦", 
                moods: { happy: "Happy & Upbeat", tired: "Tired & Energy", romantic: "Romantic & Sweet", stressed: "Stressed & Calm", health: "Healthy & Sugar-Free", festive: "Party & Festive" } 
            },
            hi: { welcome: `<strong>mingmorsels</strong> में आपका स्वागत है! 🍪✨<br><br>मैं आपका कुकी सोम्मेलीयर हूँ। शुद्ध मक्खन, प्राकृतिक स्टीविया और बेदाग सामग्रियों से बनी हमारी स्वादिष्ट कुकीज़ और मफिन्स का आनंद लें।<br><br><em>आज आपकी क्या सेवा करें?</em>`, placeholder: "फ्लेवर, सामग्री या बॉक्स साइज के बारे में पूछें...", moodLabel: "आज आपकी मनोदशा कैसी है? ✦", footer: "✦ 100% शुद्ध मक्खन · पाम ऑयल मुक्त · शून्य कृत्रिम संरक्षक · प्राकृतिक स्टीविया ✦", moods: { happy: "खुश और ऊर्जावान", tired: "थकान और ऊर्जा", romantic: "रोमांटिक और मीठा", stressed: "तनावमुक्त", health: "स्वस्थ और शुगर-फ्री", festive: "उत्सव और पार्टी" } },
            kn: { welcome: `<strong>mingmorsels</strong> ಗೆ ಸುಸ್ವಾಗತ! 🍪✨<br><br>ನಾನು ನಿಮ್ಮ ಕುಕಿ ಸೊಮೆಲಿಯರ್. ಶುದ್ಧ ಬೆಣ್ಣೆ ಹಾಗೂ ನೈಸರ್ಗಿಕ ಸ್ಟೀವಿಯಾದಿಂದ ತಯಾರಿಸಿದ ಅದ್ಭುತ ಕುಕಿಗಳು ಮತ್ತು ಮಫಿನ್‌ಗಳನ್ನು ಆನಂದಿಸಿ.<br><br><em>ಇಂದು ನಾನು ನಿಮಗೆ ಹೇಗೆ ಸಹಾಯ ಮಾಡಲಿ?</em>`, placeholder: "ರುಚಿಗಳು, ಪದಾರ್ಥಗಳು ಬಗ್ಗೆ ಕೇಳಿ...", moodLabel: "ಇಂದು ನಿಮ್ಮ ಮನಸ್ಥಿತಿ ಹೇಗಿದೆ? ✦", footer: "✦ 100% ಶುದ್ಧ ಬೆಣ್ಣೆ · ಪಾಮ್ ಆಯಿಲ್ ರಹಿತ · 100% ನೈಸರ್ಗಿಕ ಸ್ಟೀವಿಯಾ ✦", moods: { happy: "ಸಂತೋಷ", tired: "ದಣಿವಿನ ಶಕ್ತಿ", romantic: "ರೊಮ್ಯಾಂಟಿಕ್", stressed: "ಶಾಂತಿ", health: "ಆರೋಗ್ಯ", festive: "ಸಂಭ್ರಮ" } },
            ta: { welcome: `<strong>mingmorsels</strong> க்கு நல்வரவு! 🍪✨<br><br>நான் உங்கள் பிரத்யேக சமையற்கலை வழிகாட்டி. தூய வெண்ணெய் மற்றும் இயற்கை ஸ்டீவியா கலந்த சுவைகளை அனுபவியுங்கள்.<br><br><em>இன்று உங்களுக்கு நான் எவ்வாறு உதவட்டும்?</em>`, placeholder: "சுவைகள் மற்றும் பொருட்கள் பற்றி கேளுங்கள்...", moodLabel: "உங்கள் இன்றைய மனநிலை என்ன? ✦", footer: "✦ 100% தூய வெண்ணெய் · பாமாயில் இல்லை · 100% இயற்கை ஸ்டீவியா ✦", moods: { happy: "மகிழ்ச்சி", tired: "சோர்வு நீக்க", romantic: "காதல்", stressed: "அமைதி", health: "ஆரோக்கியம்", festive: "கொண்டாட்டம்" } },
            te: { welcome: `<strong>mingmorsels</strong> కి స్వాగతం! 🍪✨<br><br>నేను మీ కుకీ సోమెలియర్. స్వచ్ఛమైన వెన్న మరియు సహజ స్టీవియాతో చేసిన రుచికరమైన కుకీలు మరియు మఫిన్లను ఆస్వాదించండి.<br><br><em>ఈరోజు మీకు ఎలా సహాయపడగలను?</em>`, placeholder: "రుచులు, పదార్థాలు గురించి అడగండి...", moodLabel: "ఈరోజు మీ మూడ్ ఎలా ఉంది? ✦", footer: "✦ 100% స్వచ్ఛమైన వెண்ணె · పామాయిల్ రహితం · 100% సహజ స్టీవియా ✦", moods: { happy: "సంతోషం", tired: "శక్తి", romantic: "ప్రేమ", stressed: "ప్రశాంతత", health: "ఆరోగ్యం", festive: "ఉత్సవం" } },
            ar: { welcome: `مرحباً بكم في <strong>mingmorsels</strong>! 🍪✨<br><br>أنا خبير البسكويت الخاص بك. استمتع بأشهى قطع البسكويت والمافن المخبوزة بالزبدة النقية ونبات الستيفيا الطبيعي.<br><br><em>كيف يمكنني مساعدتك اليوم؟</em>`, placeholder: "استفسر عن النكهات والمكونات والعلب...", moodLabel: "ما هو مزاجك اليوم؟ ✦", footer: "✦ زبدة نقية 100% · بدون زيت نخيل · بدون مواد حافظة · ستيفيا طبيعية ✦", moods: { happy: "سعيد", tired: "طاقة وحيوية", romantic: "رومانسي", stressed: "استرخاء", health: "صحي وخال من السكر", festive: "احتفالي" } }
        };

        const BOT_RESPONSES = {
            all: { en: "Here is our complete handcrafted collection — <strong>6 Signature Artisan Cookies &amp; 5 Soft-Baked Muffins</strong>, baked fresh with 100% natural ingredients and gourmet flair:<br><br>🌰 <strong>Almond Rich Cookies</strong> — Slow-roasted California almonds in buttery golden dough<br>🌹 <strong>Rose Petal Cookies</strong> — Fragrant organic Damask rose petals with soothing cardamom<br>🌾 <strong>Oats &amp; Nuts Cookies</strong> — Wholesome rolled oats, walnuts, and seeds for natural sustained energy<br>🍊 <strong>Orange Peel Cookies</strong> — Zesty citrus refreshment paired with warm Ceylon cinnamon<br>🧠 <strong>California Walnut Cookies</strong> — Rich, buttery crunch packed with neuro-protective omega-3s<br>🍃 <strong>Stevia Zero-Sugar Walnut</strong> — 100% Sugar-free, diabetic-friendly, sweetened with natural Stevia<br>🍓 <strong>Strawberry Sponge Muffin</strong> — Real Mahabaleshwar strawberry coulis in a tender butter crumb<br>🍍 <strong>Pinacolada Sponge Muffin</strong> — Tropical pineapple tidbits &amp; toasted coconut flakes<br>🧈 <strong>Butterscotch Cashew Muffin</strong> — Warm caramelized brown butter with crunchy cashew bits<br>🍫 <strong>70% Belgian Dark Chocochip</strong> — Decadent single-origin dark cocoa with melting chips<br>🫐 <strong>Nordic Black Currant Muffin</strong> — Whole wheat atta muffin bursting with antioxidant-rich currants<br><br>Tap any flavour card below to pick your box size and add to cart! ✨" },
            natural: { en: "At <strong>mingmorsels</strong>, we take purity and gourmet taste seriously:<br><br>✅ <strong>Zero Palm Oil</strong> — Baked only with 100% pure pasture butter, never palm oil or hydrogenated fats<br>✅ <strong>Zero Margarine</strong> — Clean, fresh baking with no margarine spreads<br>✅ <strong>No Harmful Oils</strong> — Absolutely no refined seed oils<br>✅ <strong>Natural Plant Stevia</strong> — Clean sweetness with zero sugar spikes<br>✅ <strong>Real Terroir Ingredients</strong> — Real Damask petals, California nuts, and whole spices 🌿" },
            hello: { en: "Hello and welcome to <strong>mingmorsels</strong>! 🍪✨<br><br>We craft 6 Signature Cookies &amp; 5 Soft-Baked Muffins with 100% pure butter and natural ingredients. How can I help you today?<br><br>• Ask about any cookie or muffin flavour<br>• Tell me your mood for a personalized pairing<br>• Inquire about custom gift boxes, box sizes, or nutrition facts 🎁" },
            fallback: { en: "I'd love to help you find the right treat! You can ask about any cookie or muffin, explore box sizes, or tap any flavour pill above! 🍪✨" }
        };

        function setLang(lang, el) {
            currentLang = lang;
            document.documentElement.setAttribute('data-lang', lang);
            const info = LANGS[lang];
            document.getElementById('langCurrentFlag').textContent = info.flag;
            document.getElementById('langCurrentCode').textContent = info.code;
            document.querySelectorAll('.lang-option').forEach(o => o.classList.remove('active'));
            if (el) el.classList.add('active');
            document.body.style.direction = info.dir;
            const t = TRANSLATIONS[lang];
            document.getElementById('moodLabel').textContent = t.moodLabel;
            document.getElementById('footerNote').textContent = t.footer;
            document.getElementById('userInput').placeholder = t.placeholder;
            const m = t.moods;
            document.querySelector('.mood-txt-happy').textContent = m.happy;
            document.querySelector('.mood-txt-tired').textContent = m.tired;
            document.querySelector('.mood-txt-romantic').textContent = m.romantic;
            document.querySelector('.mood-txt-stressed').textContent = m.stressed;
            document.querySelector('.mood-txt-health').textContent = m.health;
            document.querySelector('.mood-txt-festive').textContent = m.festive;
            closeLangDropdown();
            customLocalStorage.setItem('mm-lang', lang);
            const langNames = { en: 'English', hi: 'हिन्दी', kn: 'ಕನ್ನಡ', ta: 'தமிழ்', te: 'తెలుగు', ar: 'عربي' };
            appendBotResponse({ text: `${info.flag} Language switched to <strong>${langNames[lang]}</strong>. I'll now respond in this language! ✦`, langPill: lang });
        }

        function toggleLangDropdown() { document.getElementById('langDropdown').classList.toggle('open'); }
        function closeLangDropdown() { document.getElementById('langDropdown').classList.remove('open'); }
        document.addEventListener('click', function (e) { if (!e.target.closest('#langToggle')) closeLangDropdown(); });

        (function () {
            const saved = customLocalStorage.getItem('mm-lang') || 'en';
            if (saved !== 'en') { const el = document.querySelector(`.lang-option[data-lang="${saved}"]`); setLang(saved, el); }
        })();

        const COOKIES = {
            almond: { 
                name: "Almond Rich Cookies", 
                emoji: "🌰", 
                img: "/almond/1.jpg", 
                color: "#FFF3DC", 
                review: "A classic gourmet favourite. Loaded with whole slow-roasted California almonds, 100% pasture-churned cow butter, and natural Stevia. Crisp and golden on the outside with a melt-in-the-mouth buttery finish.", 
                stars: 5, 
                price: 180, 
                nutrition: { Calories: "72.7 kcal", Carbs: "5.1g", Protein: "1.51g", Fat: "5.14g", "Saturated Fat": "3g", "Trans Fat": "0g", Sugar: "3.24g", Sodium: "89.6mg", Potassium: "397.2mg", Preservatives: "None" }, 
                tags: ["Nutrient Dense", "Pasture Butter", "Zero Palm Oil", "Stevia Sweetened"],
                boxes: [
                    { id: 'almond_snack_2pcs', name: 'Twin Delights', count: '2 Cookies', price: 40, img: '/almond-box-2pcs.png?v=2' },
                    { id: 'almond_classic_8pcs', name: 'Classic Delights', count: '8 Cookies', price: 140, img: '/almond-box-8pcs.jpg', popular: true },
                    { id: 'almond_family_12pcs', name: 'Dozen Delights', count: '12 Cookies', price: 360, img: '/almond-box-12pcs.png?v=2' }
                ]
            },
            rose: { 
                name: "Rose Petal & Cardamom Cookies", 
                emoji: "🌹", 
                img: "/rose-petal/1.jpg", 
                color: "#FDE8E8", 
                review: "Pure floral elegance in every bite. Infused with natural Damask rose petals (Rosa damascena) and aromatic green Malabar cardamom seeds for a soothing, regal teatime treat.", 
                stars: 5, 
                price: 190, 
                nutrition: { Calories: "135 kcal", Carbs: "15g", Protein: "3g", Fat: "6g", Sugar: "5g", Fibre: "1.2g", Sodium: "30mg", Preservatives: "None" }, 
                tags: ["Damask Rose", "Aromatic", "Low GI", "Handcrafted"],
                boxes: [
                    { id: 'rose_snack_2pcs', name: 'Twin Delights', count: '2 Cookies', price: 40, img: '/rose-box-2pcs.jpg' },
                    { id: 'rose_classic_8pcs', name: 'Classic Delights', count: '8 Cookies', price: 140, img: '/rose-box-8pcs.jpg', popular: true },
                    { id: 'rose_family_12pcs', name: 'Dozen Delights', count: '12 Cookies', price: 360, img: '/rose-box-12pcs.png?v=2' }
                ]
            },
            oatsnuts: { 
                name: "Oats & Nuts Cookies", 
                emoji: "🌾", 
                img: "/oats-nuts/1.jpg", 
                color: "#F5F0E8", 
                review: "Packed with wholesome rolled oats, crunchy California walnuts, golden flaxseeds, and natural Stevia. Rich in healthy beta-glucan fibre to provide clean, sustained energy throughout the day.", 
                stars: 5, 
                price: 170, 
                nutrition: { Calories: "148 kcal", Carbs: "18g", Protein: "5g", Fat: "6.5g", Sugar: "4g", Fibre: "3.2g", Sodium: "52mg", Preservatives: "None" }, 
                tags: ["High Fibre", "Rolled Oats", "Omega-3", "Clean Energy"],
                boxes: [
                    { id: 'oatsnuts_snack_2pcs', name: 'Twin Delights', count: '2 Cookies', price: 40, img: '/oats-box-2pcs.jpg' },
                    { id: 'oatsnuts_classic_8pcs', name: 'Classic Delights', count: '8 Cookies', price: 140, img: '/oats-box-8pcs.jpg', popular: true },
                    { id: 'oatsnuts_family_12pcs', name: 'Dozen Delights', count: '12 Cookies', price: 360, img: '/oats-box-12pcs.jpg' }
                ]
            },
            orange: { 
                name: "Orange Peel Shortbread", 
                emoji: "🍊", 
                img: "/orange-peel/1.jpg", 
                color: "#FFF0E0", 
                review: "A refreshing citrus twist on traditional butter shortbread. Imbued with cold-pressed Valencia orange peel oils and Ceylon true cinnamon for a zesty, uplifting flavor profile.", 
                stars: 5, 
                price: 185, 
                nutrition: { Calories: "138 kcal", Carbs: "16g", Protein: "3.2g", Fat: "6.2g", Sugar: "5.5g", Fibre: "1.4g", Sodium: "35mg", Preservatives: "None" }, 
                tags: ["Valencia Orange", "Ceylon Cinnamon", "Zesty Shortbread", "Zero Dalda"],
                boxes: [
                    { id: 'orange_snack_2pcs', name: 'Twin Delights', count: '2 Cookies', price: 40, img: '/orange-box-2pcs.jpg' },
                    { id: 'orange_classic_8pcs', name: 'Classic Delights', count: '8 Cookies', price: 140, img: '/orange-box-8pcs.jpg', popular: true },
                    { id: 'orange_family_12pcs', name: 'Dozen Delights', count: '12 Cookies', price: 360, img: '/box-classic.jpg' }
                ]
            },
            walnut: { 
                name: "California Walnut Cookies", 
                emoji: "🧠", 
                img: "/img-walnut.png?v=2", 
                color: "#F7EFE8", 
                review: "Generously packed with whole California walnuts in golden butter dough. Delivers a satisfying crunch with natural neuro-protective omega-3 healthy fats, sweetened with plant-based Stevia.", 
                stars: 5, 
                price: 210, 
                nutrition: { Calories: "145 kcal", Carbs: "14g", Protein: "4.2g", Fat: "8.5g", Sugar: "4.5g", Fibre: "2.1g", Sodium: "38mg", Preservatives: "None" }, 
                tags: ["California Walnuts", "Omega-3 Rich", "Nut Rich", "Zero Trans-Fats"],
                boxes: [
                    { id: 'walnut_snack_2pcs', name: 'Twin Delights', count: '2 Cookies', price: 50, img: '/box-classic.jpg' },
                    { id: 'walnut_classic_8pcs', name: 'Classic Delights', count: '8 Cookies', price: 210, img: '/box-lush.jpg', popular: true },
                    { id: 'walnut_family_12pcs', name: 'Dozen Delights', count: '12 Cookies', price: 420, img: '/box-extra.jpg' }
                ]
            },
            walnut_sf: { 
                name: "Sugar-Free Walnut Cookies", 
                emoji: "🍃", 
                img: "/img-walnut-sf.png?v=2", 
                color: "#EBF5EB", 
                review: "100% Zero Added Sugar! Sweetened exclusively with natural plant Stevia extract and filled with roasted California walnuts. Guilt-free, diabetic-friendly, and keto-compliant.", 
                stars: 5, 
                price: 220, 
                nutrition: { Calories: "128 kcal", Carbs: "9g", Protein: "4.8g", Fat: "8.2g", Sugar: "0g", Fibre: "3.5g", Sodium: "32mg", Preservatives: "None" }, 
                tags: ["100% Sugar Free", "Natural Stevia", "Diabetic Friendly", "Keto Approved"],
                boxes: [
                    { id: 'walnut_sf_snack_2pcs', name: 'Twin Delights', count: '2 Cookies', price: 55, img: '/box-classic.jpg' },
                    { id: 'walnut_sf_classic_8pcs', name: 'Classic Delights', count: '8 Cookies', price: 220, img: '/box-lush.jpg', popular: true },
                    { id: 'walnut_sf_family_12pcs', name: 'Dozen Delights', count: '12 Cookies', price: 440, img: '/box-extra.jpg' }
                ]
            },
            strawberry: { 
                name: "Strawberry Muffin", 
                type: "muffin", 
                emoji: "🍓", 
                img: "/img-strawberry.jpg", 
                color: "#FCEEEE", 
                nutrition: { Calories: "320 kcal", Carbs: "45g", Protein: "5.07g", Fat: "13.47g", Sugar: "26.86g", Fibre: "7.13g" },
                review: "A soft, moist sponge muffin infused with real Mahabaleshwar strawberry compote and crowned with a buttery streusel crumble topping.", 
                ingredients: "Fresh Strawberry Compote, Whole Wheat Flour, Unsalted Pasture Butter, Pure Vanilla, Stevia.", 
                price: 140, 
                popular: false,
                tags: ["Real Fruit", "Crumble Top", "Pasture Butter"],
                boxes: [
                    { id: 'strawberry_single_2pcs', name: 'Twin Delights', count: '2 Muffins', price: 70, img: '/box-strawberry-1.jpg' },
                    { id: 'strawberry_box_4pcs', name: 'Classic Delights', count: '4 Muffins', price: 140, img: '/box-strawberry-2.jpg', popular: true },
                    { id: 'strawberry_party_6pcs', name: 'Dozen Delights', count: '6 Muffins', price: 210, img: '/box-strawberry-2.jpg' }
                ]
            },
            pinacolada: { 
                name: "Pinacolada Muffin", 
                type: "muffin", 
                emoji: "🍍", 
                img: "/img-pinacolada.jpg", 
                color: "#FFFBEA", 
                nutrition: { Calories: "320 kcal", Carbs: "45g", Protein: "5.07g", Fat: "13.47g", Sugar: "26.86g", Fibre: "7.13g" }, 
                review: "A tropical vacation for your palate. Juicy pineapple tidbits and toasted coconut flakes baked into a light, tender vanilla sponge.", 
                ingredients: "Golden Pineapple Tidbits, Toasted Coconut Flakes, Pure Cow Butter, Stevia, Whole Flour.", 
                price: 135, 
                popular: false, 
                tags: ["Tropical Pineapple", "Toasted Coconut", "Moist Sponge"], 
                boxes: [
                    { id: 'pinacolada_single_2pcs', name: 'Twin Delights', count: '2 Muffins', price: 75, img: '/box-pinacolada-1.jpg' },
                    { id: 'pinacolada_box_4pcs', name: 'Classic Delights', count: '4 Muffins', price: 150, img: '/box-pinacolada-2.jpg', popular: true },
                    { id: 'pinacolada_party_6pcs', name: 'Dozen Delights', count: '6 Muffins', price: 225, img: '/box-pinacolada-2.jpg' }
                ]
            },
            butterscotch: { 
                name: "Butterscotch Cashew Muffin", 
                emoji: "🧈", 
                img: "/img-butterscotch.jpg", 
                color: "#FDF4E5", 
                review: "Rich brown butter muffin base loaded with caramelized butterscotch crunch pearls and roasted Goan cashews. Comforting and delicious.", 
                stars: 5, 
                price: 150, 
                nutrition: { Calories: "320 kcal", Carbs: "45g", Protein: "5.07g", Fat: "13.47g", Sugar: "26.86g", Fibre: "7.13g", Preservatives: "None" }, 
                tags: ["Butterscotch Crunch", "Goan Cashews", "Zero Margarine"], 
                boxes: [
                    { id: 'butterscotch_single_2pcs', name: 'Twin Delights', count: '2 Muffins', price: 75, img: '/box-butterscotch-1.jpg' },
                    { id: 'butterscotch_box_4pcs', name: 'Classic Delights', count: '4 Muffins', price: 150, img: '/box-butterscotch-2.jpg', popular: true },
                    { id: 'butterscotch_party_6pcs', name: 'Dozen Delights', count: '6 Muffins', price: 225, img: '/box-butterscotch-2.jpg' }
                ]
            },
            chocochip: { 
                name: "70% Dark Chocochip Muffin", 
                type: "muffin", 
                emoji: "🍫", 
                img: "/img-chocochip.jpg", 
                color: "#F5ECE6", 
                nutrition: { Calories: "320 kcal", Carbs: "45g", Protein: "5.07g", Fat: "13.47g", Sugar: "26.86g", Fibre: "6.13g" }, 
                review: "For true chocolate connoisseurs. Rich single-origin 70% dark Belgian cocoa sponge packed with bittersweet chocolate chips that melt when warmed.", 
                ingredients: "70% Belgian Dark Chocolate, Dutch Alkalized Cocoa, Pasture Butter, Stevia, Whole Wheat.", 
                price: 150, 
                popular: true, 
                tags: ["70% Belgian Chocolate", "Melted Chips", "Decadent"], 
                boxes: [
                    { id: 'chocochip_single_2pcs', name: 'Twin Delights', count: '2 Muffins', price: 80, img: '/box-chocochip-1.jpg' },
                    { id: 'chocochip_box_4pcs', name: 'Classic Delights', count: '4 Muffins', price: 140, img: '/box-chocochip-2.jpg', popular: true },
                    { id: 'chocochip_party_6pcs', name: 'Dozen Delights', count: '6 Muffins', price: 240, img: '/box-chocochip-2.jpg' }
                ]
            },
            blackcurrant: { 
                name: "Black Currant Atta Muffin", 
                type: "muffin", 
                emoji: "🫐", 
                img: "/img-blackcurrant.jpg", 
                color: "#F1EDF5", 
                nutrition: { Calories: "320 kcal", Carbs: "45g", Protein: "5.07g", Fat: "13.47g", Sugar: "26.86g", Fibre: "7.13g" }, 
                review: "Wholesome stone-ground atta muffin bursting with tangy black currants rich in natural antioxidants. A harmonious balance of sweet and tart.", 
                ingredients: "Stone-Ground Whole Wheat Atta, Black Currant Extract, Natural Stevia, Cultured Butter.", 
                price: 150, 
                popular: false, 
                tags: ["Whole Wheat Atta", "Antioxidant Rich", "Zero Palm Oil"], 
                boxes: [
                    { id: 'blackcurrant_single_2pcs', name: 'Twin Delights', count: '2 Muffins', price: 75, img: '/box-blackcurrant-1.jpg' },
                    { id: 'blackcurrant_box_4pcs', name: 'Classic Delights', count: '4 Muffins', price: 150, img: '/box-blackcurrant-2.jpg', popular: true },
                    { id: 'blackcurrant_party_6pcs', name: 'Dozen Delights', count: '6 Muffins', price: 225, img: '/box-blackcurrant-2.jpg' }
                ]
            }
        };

        const MOOD_MAP = { happy: ["rose", "orange", "strawberry", "pinacolada", "walnut"], tired: ["oatsnuts", "almond", "chocochip", "butterscotch", "blackcurrant"], romantic: ["rose", "strawberry", "chocochip", "walnut"], stressed: ["almond", "oatsnuts", "butterscotch", "walnut"], health: ["walnut_sf", "oatsnuts", "almond", "blackcurrant", "walnut"], festive: ["rose", "orange", "butterscotch", "chocochip", "walnut"], sad: ["chocochip", "butterscotch", "almond", "walnut"], anxious: ["oatsnuts", "rose", "pinacolada", "walnut_sf"], energetic: ["oatsnuts", "almond", "blackcurrant", "walnut"] };

        function fuzzyMatch(query) {
            if (!query) return null;
            query = query.toLowerCase();
            const keyMap = { 
                almond: ["almond", "almnd", "badam"], 
                rose: ["rose", "floral", "petal", "flower", "gulab"], 
                oatsnuts: ["oat", "oats", "oat nut", "granola"], 
                orange: ["orange", "citrus", "peel", "zest", "tangy"], 
                walnut: ["walnut", "walnuts", "akhrot", "walnut cookie", "walnut cookies"],
                walnut_sf: ["sugar free", "sugarfree", "sugar-free", "stevia", "diabetic", "zero sugar", "keto", "sugar free walnut", "sugar free cookie", "sugar free cookies", "sugarfree walnut", "sf walnut"],
                strawberry: ["strawberry", "strawberri", "berry", "muffin strawberry"], 
                pineapple: ["pineapple", "ananas", "muffin pineapple"], 
                butterscotch: ["butterscotch", "caramel", "muffin butterscotch"], 
                choco: ["choco", "chocolate", "dark chocolate", "fudge", "muffin choco"] 
            };
            const qc = query.replace(/[^a-z0-9\s]/g, '').trim();
            if (!qc) return null;
            const qw = qc.split(/\s+/).filter(w => w.length > 0);
            function lev(a, b) { const m = []; for (let i = 0; i <= b.length; i++)m[i] = [i]; for (let j = 0; j <= a.length; j++)m[0][j] = j; for (let i = 1; i <= b.length; i++)for (let j = 1; j <= a.length; j++) { if (b[i - 1] === a[j - 1]) m[i][j] = m[i - 1][j - 1]; else m[i][j] = Math.min(m[i - 1][j - 1] + 1, m[i][j - 1] + 1, m[i - 1][j] + 1); } return m[b.length][a.length]; }
            function ws(a, b) { if (a === b) return 1; const ml = Math.max(a.length, b.length); if (!ml) return 0; return 1 - (lev(a, b) / ml); }
            function score(qw, kw) { if (!kw.length || !qw.length) return 0; const ks = kw.split(/\s+/); let best = 0; const ws_ = kw.length === 1 ? 1 : ks.length; for (let i = 0; i <= qw.length - ws_; i++) { let s = 0; for (let j = 0; j < ws_; j++)s += ws(qw[i + j] || '', ks[j] || ''); const sc = s / ws_; if (sc > best) best = sc; } return best; }
            let bestKey = null, bestScore = 0.70;
            for (let k in keyMap) { for (let phrase of keyMap[k]) { const sc = score(qw, phrase); if (sc > bestScore) { bestScore = sc; bestKey = k; } } }
            return bestKey;
        }

        function detectMood(q) {
            q = q.toLowerCase();
            if (/happy|joyful|joy|excit|celebrat|good mood|खुश|ಸಂತೋಷ|மகிழ்|సంతోషం|heureux|سعيد|സಂತೋಷ/.test(q)) return 'happy';
            if (/tired|exhaust|sleepy|energy|drain|थका|ದಣಿದ|சோர்வ|అలసట|fatigué|metعب|ക്ഷീണ/.test(q)) return 'tired';
            if (/romant|love|crush|date|partner|प्यार|ರೊಮ್ಯಾಂಟಿ|காதல|రೊమాంటి|romantique|رومانسي/.test(q)) return 'romantic';
            if (/stress|anxious|anxiety|nervous|tension|overwhelm|तनाव|ಒತ್ತಡ|மன அழுத்தம|ఒత్తిడి|stressé|metوتر/.test(q)) return 'stressed';
            if (/health|fit|diet|diabetic|sugar free|workout|स्वास्थ|ಆರೋಗ್ಯ|ஆரோக்கி|ఆరోగ్య|santé|صحة/.test(q)) return 'health';
            if (/festive|festival|celebrat|diwali|party|gift|उत्सव|ಹಬ್ಬ|திருவிழா|పండుగ|festif|مبتهج|ಆഘോഷ/.test(q)) return 'festive';
            if (/sad|depress|down|lonely|उदास/.test(q)) return 'sad';
            return null;
        }

        function getLangText(key, lang) {
            const d = BOT_RESPONSES[key];
            return d && d[lang] ? d[lang] : (d && d['en'] ? d['en'] : null);
        }

        function renderCookieCard(key) {
            const c = COOKIES[key];
            const stars = '★'.repeat(c.stars) + '☆'.repeat(5 - c.stars);
            const nutHTML = Object.entries(c.nutrition).map(([k, v]) => `<div class="nut-item"><div class="nut-val">${v}</div><div class="nut-key">${k}</div></div>`).join('');
            const tagsHTML = c.tags.map(t => `<span class="badge-natural">${t}</span>`).join(' ');
            const imgHTML = c.img ? `<img class="cookie-card-img" src="${c.img}" alt="${c.name}" onerror="this.style.display='none'">` : `<div class="cookie-card-img-placeholder" style="background:${c.color}">${c.emoji}</div>`;
            const uid = 'card-' + key + '-' + Date.now();

            const boxesHTML = Array.isArray(c.boxes) ? `
                <div style="margin-top:12px; background:rgba(61,32,0,0.04); border-radius:12px; padding:10px 12px; border:1px solid rgba(61,32,0,0.08);">
                    <div style="font-size:11px; font-weight:700; text-transform:uppercase; color:#8C533E; margin-bottom:8px; display:flex; justify-content:space-between; align-items:center;">
                        <span>📦 Available Box Sizes &amp; Pricing:</span>
                        <span style="color:#2E6B1A; font-size:10px; font-weight:600;">Brand Packaging</span>
                    </div>
                    <div style="display:grid; grid-template-columns:repeat(3, 1fr); gap:8px;">
                        ${c.boxes.map(b => `
                            <div style="background:#FFF; border:1.5px solid ${b.popular ? '#C6960C' : '#E8DFD5'}; border-radius:8px; padding:8px 6px; text-align:center; display:flex; flex-direction:column; justify-content:space-between; box-shadow:0 2px 5px rgba(0,0,0,0.03);">
                                <div style="font-size:11.5px; font-weight:700; color:#3D2000; line-height:1.2;">${b.name}</div>
                                <div style="font-size:10px; color:#5B2C6F; font-weight:600; margin:2px 0;">${b.count}</div>
                                <div style="font-size:13px; font-weight:800; color:#C6960C; margin:3px 0 6px;">₹${b.price}</div>
                                <button onclick="addChatbotBoxToCart('${b.id}', '${c.name.replace(/'/g, "\\'")}', '${b.name}', ${b.price}, '${b.img || c.img}')" style="background:linear-gradient(135deg, #C6960C 0%, #A67C00 100%); color:#FFF; border:none; border-radius:6px; padding:4px 6px; font-size:10px; font-weight:700; cursor:pointer; width:100%;">+ Add</button>
                            </div>
                        `).join('')}
                    </div>
                </div>
            ` : '';

            return `<div class="cookie-card" id="${uid}">${imgHTML}<div class="cookie-card-body"><div class="stars">${stars} (5.0)</div><div class="cookie-card-name">${c.emoji} ${c.name}</div><div class="cookie-card-review">${c.review}</div><div class="nutrition-grid">${nutHTML}</div>${boxesHTML}<div style="margin-top:8px">${tagsHTML}</div></div><div class="card-share-bar"><button class="card-share-btn card-btn-download" onclick="downloadCookieCard('${key}','${uid}')"><svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg> Download Card</button><button class="card-share-btn card-btn-share" id="sharebtn-${uid}" onclick="shareCookieCard('${key}','${uid}')"><svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/><line x1="8.59" y1="13.51" x2="15.42" y2="17.49"/><line x1="15.41" y1="6.51" x2="8.59" y2="10.49"/></svg> Share</button></div></div>`;
        }

        function addChatbotBoxToCart(boxId, productName, boxName, price, image) {
            if (window.top && window.top.cartStore) {
                window.top.cartStore.addItem({
                    id: boxId,
                    name: `${productName} (${boxName})`,
                    price: price,
                    quantity: 1,
                    image: image
                });
                if (window.top.uiController) {
                    window.top.uiController.openCartDrawer();
                }
                showToast(`✓ Added ${boxName} of ${productName} to Basket!`);
            } else {
                addToCart(boxId);
                showToast(`✓ Added ${boxName} to Basket!`);
            }
        }

        const MOOD_INTROS = {
            happy: { en: "Feeling happy and energized! Here are our crisp, uplifting treats to keep that good vibe going: ✨🎉", hi: "खुश और ऊर्जावान! आपके आनंद को बढ़ाने के लिए हमारी विशेष कुकीज़: ✨🎉", kn: "ಹರ್ಷದಾಯಕ ಮನಸ್ಥಿತಿ! ನಿಮ್ಮ ಸಂತೋಷವನ್ನು ಹೆಚ್ಚಿಸಲು ನಮ್ಮ ವಿಶೇಷ ಆಯ್ಕೆ: ✨🎉", ta: "மகிழ்ச்சியான தருணம்! உங்கள் உற்சாகத்தை கூட்ட எங்களின் தேர்வு: ✨🎉", te: "ఆనందకరమైన సమయం! మీ ఉత్సాహాన్ని రెట్టింపు చేసే అద్భుత రుచులు: ✨🎉", fr: "De bonne humeur! Voici nos créations gourmandes pour vous: ✨🎉", ar: "مزاج مبتهج ورائع! إليك أشهى الحلويات لتكمل يومك: ✨🎉", ml: "സന്തോഷകരമായ സമയം! ✨🎉" },
            tired: { en: "Feeling low on energy? These nutrient-packed oats and roasted nuts give you clean, sustained stamina: ⚡", hi: "थकान महसूस हो रही है? ये पौष्टिक ओट्स और मेवे आपको नई ताजगी देंगे! ⚡", kn: "ಆಯಾಸವೇ? ನೈಸರ್ಗಿಕ ಶಕ್ತಿ ನೀಡುವ ವಿಶಿಷ್ಟ ಕುಕಿಗಳು: ⚡", ta: "சோர்வாக உணர்கிறீர்களா? உடனடி இயற்கை புத்துணர்ச்சிக்கு: ⚡", te: "అలసటగా ఉందా? సహజ శక్తిని అందించే రుచులు: ⚡", fr: "Besoin d'énergie? Retrouvez votre vitalité naturelle: ⚡", ar: "هل تشعر بالإجهاد؟ إليك ما يجدد طاقتك الحيوية: ⚡", ml: "ഊർജ്ജം വീണ്ടെടുക്കാൻ: ⚡" },
            romantic: { en: "In a sweet and romantic mood? Our delicate Damask rose petals and rich 70% dark Belgian chocochip are made for sharing: 🌹💕", hi: "रोमांटिक और मीठा माहौल! गुलाब और डार्क चॉकलेट का यह स्वादिष्ट सम्मिश्रण: 🌹💕", kn: "ರೊಮ್ಯಾಂಟಿಕ್ ಕ್ಷಣಗಳು! ಗುಲಾಬಿ ಹಾಗೂ ಡಾರ್ಕ್ ಚಾಕೊಲೇಟ್ ಸಂಗಮ: 🌹💕", ta: "காதல் ததும்பும் நேரம்! ரோஜா மற்றும் சாக்லேட் சுவைகள்: 🌹💕", te: "రొమాంటిక్ క్షణాలు! గులాబీ మరియు డార్క్ చాక్లెట్ రుచులు: 🌹💕", fr: "Humeur romantique et gourmande: 🌹💕", ar: "لحظات رومانسية مميزة ولذيذة: 🌹💕", ml: "റൊമാന്റിക് അനുഭൂതി: 🌹💕" },
            stressed: { en: "Take a deep breath — these buttery California walnut cookies bring calm, comfort, and brain-boosting omega-3s: 🧘🤍", hi: "तनाव से राहत! अखरोट और शुद्ध मक्खन की यह शांतिदायक मिठास: 🧘🤍", kn: "ಮನಸ್ಸಿನ ಶಾಂತಿಗೆ! ಒಮೆಗಾ-3 ಸಮೃದ್ಧ ವಾಲ್ನಟ್ ಕುಕಿಗಳು: 🧘🤍", ta: "மன அமைதிக்கு! ஒமேகா-3 நிறைந்த வால்நட் தேர்வு: 🧘🤍", te: "ప్రశాంతత కోసం! ఒమేగా-3 సమృద్ధ వాల్నట్ రుచులు: 🧘🤍", fr: "Prenez une pause apaisante et réconfortante: 🧘🤍", ar: "لاستعادة السكينة والهدوء: 🧘🤍", ml: "മനസ്സിന് ശാന്തി നൽകാൻ: 🧘🤍" },
            health: { en: "Looking for healthy & guilt-free indulgence? 100% Sugar-free, sweetened with pure plant Stevia: 🥗🌿", hi: "स्वास्थ्य और शुद्धता! 100% बिना चीनी, प्राकृतिक स्टीविया युक्त: 🥗🌿", kn: "ಆರೋಗ್ಯಕ್ಕೆ ಆದ್ಯತೆ! ಸಕ್ಕರೆ ರಹಿತ ಶುದ್ಧ ಸ್ಟೀವಿಯಾ ಕುಕಿಗಳು: 🥗🌿", ta: "ஆரோக்கியத்திற்கான அற்புதம்! சர்க்கரை இல்லாத ஸ்டீவியா குக்கிகள்: 🥗🌿", te: "ఆరోగ్యకరమైన ఎంపిక! చక్కెర రహిత స్టీవియా రుచులు: 🥗🌿", fr: "Gourmandise saine et sans sucre ajouté: 🥗🌿", ar: "حلويات صحية ولذيذة خالية من السكر: 🥗🌿", ml: "ആരോഗ്യകരമായ തിരഞ്ഞെടുപ്പ്: 🥗🌿" },
            festive: { en: "Ready to celebrate! Our most popular luxury gift boxes and bestselling cookie assortments: 🎉✨", hi: "उत्सव और पार्टी! उपहार और दावतों के लिए हमारा सर्वश्रेष्ठ संग्रह: 🎉✨", kn: "ಸಂಭ್ರಮದ ಕ್ಷಣಗಳು! ಉಡುಗೊರೆಗಾಗಿ ಅತ್ಯುತ್ತಮ ಆಯ್ಕೆ: 🎉✨", ta: "கொண்டாட்ட தருணங்கள்! பரிசளிக்க சிறந்த தேர்வுகள்: 🎉✨", te: "ఉత్సవ సంబరాలు! గిఫ్ట్ కోసం అద్భుతమైన రుచులు: 🎉✨", fr: "Célébrez avec nos coffrets cadeaux festifs: 🎉✨", ar: "احتفل بأرقى علب الهدايا الفاخرة: 🎉✨", ml: "ഉത്സവാഘോഷങ്ങൾ: 🎉✨" },
            sad: { en: "Sending you warmth and comfort 🤗 A warm cup of tea paired with rich chocolate chip and butterscotch will brighten your day:", hi: "मन को सांत्वना देने वाली हमारी सबसे स्वादिष्ट और आरामदायक कुकीज़: 🤗", kn: "ಮನಸ್ಸಿಗೆ ಆಹ್ಲಾದ ನೀಡುವ ವಿಶಿಷ್ಟ ಕುಕಿಗಳು: 🤗", ta: "மனதை இதமாக்கும் சுவைகள்: 🤗", te: "మనసుకు హాయినిచ్చే రుచులు: 🤗", fr: "Un réconfort chaleureux et gourmand: 🤗", ar: "نرسل لك الدفء والسعادة مع أشهى الشوكولاتة: 🤗", ml: "ആശ്വാസം നൽകുന്നവ: 🤗" }
        };

        function getBotReply(userMsg) {
            const q = userMsg.toLowerCase();
            const lang = currentLang;

            // Name extraction logic
            let nameFound = null;

            // 1. English patterns: "my name is X", "i am X", "i'm X", "call me X", "this is X"
            const enNameMatch = userMsg.match(/\b(?:my name is|call me|this is)\s+([a-zA-Z\s'-]+)/i);
            if (enNameMatch) {
                nameFound = enNameMatch[1].trim();
            } else {
                const imNameMatch = userMsg.match(/\b(?:i am|i'm)\s+([a-zA-Z\s'-]+)/i);
                if (imNameMatch) {
                    const candidate = imNameMatch[1].trim();
                    const exclusions = ["tired", "happy", "romantic", "stressed", "sad", "health", "festive", "hungry", "looking", "a cookie", "cookies", "vegan", "diabetic", "here", "fine", "good", "okay", "well", "great", "bot", "assistant"];
                    const lowerCandidate = candidate.toLowerCase();
                    if (!exclusions.some(word => lowerCandidate.includes(word)) && candidate.length > 0) {
                        nameFound = candidate;
                    }
                }
            }

            // 2. Hindi patterns: "मेरा नाम X है", "मैं X हूँ"
            if (!nameFound) {
                const hiNameMatch = userMsg.match(/(?:\u092e\u0947\u0930\u093e\s+\u0928\u093e\u092e|\u092e\u0947\u0930\u093e\u0928\u093e\u092e)\s+([^\s\u0964]+)/i) || userMsg.match(/([^\s\u0964]+)\s+(?:\u092e\u0947\u0930\u093e\s+\u0928\u093e\u092e\s+\u0939\u0948|\u092e\u0947\u0930\u093e\u0928\u093e\u092e\u0939\u0948)/i);
                if (hiNameMatch) {
                    nameFound = hiNameMatch[1].trim();
                } else {
                    const hiNameMatch2 = userMsg.match(/\u092e\u0948\u0902\s+([^\s\u0964]+)\s+\u0939\u0942\u0901/i);
                    if (hiNameMatch2) {
                        const candidate = hiNameMatch2[1].trim();
                        if (!["\u0925\u0915\u093e", "\u0916\u0941\u0936", "\u0924\u0928\u093e\u0935", "\u092c\u0940\u092e\u093e\u0930", "\u0920\u0940\u0915", "\u092c\u094act"].some(word => candidate.includes(word))) {
                            nameFound = candidate;
                        }
                    }
                }
            }

            // 3. Kannada patterns: "ನನ್ನ ಹೆಸರು X"
            if (!nameFound) {
                const knNameMatch = userMsg.match(/(?:\u0ca8\u0ca8\u0ccd\u0ca8\s+\u0cb9\u0cc6\u0cb8\u0cb0\u0cc1|\u0cb9\u0cc6\u0cb8\u0cb0\u0cc1)\s+([^\s]+)/i);
                if (knNameMatch) {
                    nameFound = knNameMatch[1].trim();
                }
            }

            // 4. Tamil patterns: "என் பெயர் X"
            if (!nameFound) {
                const taNameMatch = userMsg.match(/(?:\u0b8e\u0ba9\u0bcd\s+\u0baa\u0bc6\u0baf\u0bb0\u0bcd|\u0baa\u0bc6\u0baf\u0bb0\u0bcd)\s+([^\s]+)/i);
                if (taNameMatch) {
                    nameFound = taNameMatch[1].trim();
                }
            }

            // 5. Telugu patterns: "నా పేరు X"
            if (!nameFound) {
                const teNameMatch = userMsg.match(/(?:\u0c28\u0c3e\s+\u0c2a\u0c47\u0c30\u0c41|\u0c2a\u0c47\u0c30\u0c41)\s+([^\s]+)/i);
                if (teNameMatch) {
                    nameFound = teNameMatch[1].trim();
                }
            }

            // 6. Arabic patterns: "اسمي X", "أنا X"
            if (!nameFound) {
                const arNameMatch = userMsg.match(/(?:\u0627\u0633\u0645\u064a|\u0625\u0633\u0645\u064a)\s+([^\s]+)/i);
                if (arNameMatch) {
                    nameFound = arNameMatch[1].trim();
                } else {
                    const arNameMatch2 = userMsg.match(/\u0623\u0646\u0627\s+([^\s]+)/i);
                    if (arNameMatch2) {
                        const candidate = arNameMatch2[1].trim();
                        if (!["\u0645\u062a\u0639\u0628", "\u0633\u0639\u064a\u062f", "\u062d\u0632\u064a\u0646", "\u0645\u0631\u064a\u0636", "\u0628\u062e\u064a\u0631", "\u0628\u0648\u062a"].some(word => candidate.includes(word))) {
                            nameFound = candidate;
                        }
                    }
                }
            }

            if (nameFound) {
                nameFound = nameFound.replace(/[.,\/#!$%\^&\*;:{}=\-_`~()?।\u0964]/g, "").trim();
                if (nameFound.length > 0) {
                    const formattedName = nameFound.split(/\s+/).map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
                    userName = formattedName; // Save in global variable

                    const welcomes = {
                        en: `Hi <strong>${formattedName}</strong>, welcome to mingmorsels cookie collection! \ud83c\udf6a`,
                        hi: `\u0928\u092e\u0938\u094d\u0924\u0947 <strong>${formattedName}</strong>, mingmorsels \u0915\u0941\u0915\u0940 \u0938\u0902\u0917\u094d\u0930\u0939 \u092e\u0947\u0902 \u0906\u092a\u0915\u093e \u0938\u094d\u0935\u093e\u0917\u0924 \u0939\u0948! \ud83c\udf6a`,
                        kn: `\u0ca8\u0cae\u0cb8\u0ccd\u0c95\u0cbe\u0cb0 <strong>${formattedName}</strong>, mingmorsels \u0c95\u0cc1\u0c95\u0cbf \u0cb8\u0c82\u0c97\u0ccd\u0cb0\u0cb9\u0c95\u0ccd\u0c95\u0c47 \u0cb8\u0ccd\u0cb5\u0cbe\u0c97\u0ca4! \ud83c\udf6a`,
                        ta: `\u0bb5\u0ba3\u0b95\u0bcd\u0b95\u0bae\u0bcd <strong>${formattedName}</strong>, mingmorsels \u0b95\u0bc1\u0b95\u0bcd\u0b95\u0bbf \u0b9a\u0bc7\u0b95\u0bb0\u0bbf\u0baa\u0bcd\u0baa\u0bbf\u0bb1\u0bcd\u0b95\u0bc1 \u0bb5\u0bb0\u0bc7\u0bb1\u0bcd\u0b95\u0bbf\u0bb1\u0bcb\u0bae\u0bcd! \ud83c\udf6a`,
                        te: `\u0c28\u0c2e\u0c38\u0c4d\u0c15\u0c3e\u0c30\u0c02 <strong>${formattedName}</strong>, mingmorsels \u0c15\u0c41\u0c15\u0c40\u0c32 \u0c38\u0c47\u0c15\u0c30\u0c23\u0c15\u0c41 \u0c38\u0c4d\u0c35\u0c3e\u0c17\u0c24\u0c02! \ud83c\udf6a`,
                        ar: `\u0645\u0631\u062d\u0628\u0627\u064b <strong>${formattedName}</strong>\u060c \u0645\u0631\u062d\u0628\u0627\u064b \u0628\u0643 \u0641\u064a \u0645\u062c\u0645\u0648\u0639\u0629 \u0628\u0633\u0643\u0648\u064a\u062a mingmorsels! \ud83c\udf6a`
                    };
                    return { text: welcomes[lang] || welcomes.en };
                }
            }

            const matched = fuzzyMatch(q);
            const mood = detectMood(q);
            if (/all|every|list|show|offer|have|menu|catalog|सभी|ಎಲ್ಲಾ|எல்லாம்|అన్నీ|tous|كل/.test(q) && !matched) return { text: getLangText('all', lang) };
            if (matched) {
                const cookieName = COOKIES[matched].name;
                const intros = { en: `Here are the full details on our <strong>${cookieName}</strong>! ✦`, hi: `यहाँ हमारी <strong>${cookieName}</strong> की पूरी जानकारी है! ✦`, kn: `ನಮ್ಮ <strong>${cookieName}</strong> ಬಗ್ಗೆ ಸಂಪೂರ್ಣ ವಿವರ! ✦`, ta: `எங்கள் <strong>${cookieName}</strong> பற்றிய முழு விவரம்! ✦`, te: `మా <strong>${cookieName}</strong> గురించి పూర్తి వివరాలు! ✦`, ar: `إليك التفاصيل الكاملة عن <strong>${cookieName}</strong>! ✦` };
                return { text: intros[lang] || intros.en, card: matched };
            }
            if (mood) {
                const picks = MOOD_MAP[mood] || ['almond', 'rose'];
                const introMap = MOOD_INTROS[mood] || MOOD_INTROS.happy;
                const intro = introMap[lang] || introMap.en;
                const cards = picks.map(k => renderCookieCard(k)).join('');
                return { text: intro, cards };
            }
            if (/natural|preserv|dalda|oil|healthy|ingred|safe|clean|प्राकृत|ನೈಸರ್ಗ|இயற்கை|సహజ|naturel|طبيعي/.test(q)) return { text: getLangText('natural', lang) };
            if (/diabetic|sugar free|no sugar|blood sugar|zero sugar|stevia|keto|मधुमेह|ಮಧುಮೇಹ|நீரிழிவு|మధుమేహ|diabétique|سكري/.test(q)) return { text: { en: "For our diabetic-conscious & keto friends, our 100% Zero Added Sugar option:", hi: "100% बिना चीनी, मधुमेह व कीटो के लिए उपयुक्त:", kn: "100% ಸಕ್ಕರೆ ರಹಿತ, ಮಧುಮೇಹ ಹಾಗೂ ಕೀಟೋ ಸ್ನೇಹಿ:", ta: "100% சர்க்கரை இல்லாத, நீரிழிவு மற்றும் கீட்டோ தேர்வு:", te: "100% చక్కెర లేని, మధుమేహ మరియు కీటో ఎంపిక:", fr: "100% sans sucre ajouté pour diabétiques et céto:", ar: "خالٍ من السكر 100% لمرضى السكري وحمية الكيتو:" }[lang] || "For our diabetic-conscious friends, our 100% Zero Added Sugar option:", card: 'walnut_sf' };
            if (/hello|hi|hey|good morning|namaste|hola|नमस्ते|ನಮಸ್ಕಾರ|வணக்கம்|నమస్కారం|bonjour|مرحبا/.test(q)) {
                if (userName) {
                    const greetings = {
                        en: `Hello <strong>${userName}</strong>! Welcome back to mingmorsels cookie collection! \ud83c\udf6a\u2728`,
                        hi: `\u0928\u092e\u0938\u094d\u0924\u0947 <strong>${userName}</strong>! mingmorsels \u0915\u0941\u0915\u0940 \u0938\u0902\u0917\u094d\u0930\u0939 \u092e\u0947\u0902 \u0906\u092a\u0915\u093e \u092b\u093f\u0930 \u0938\u094d\u0935\u093e\u0917\u0924 \u0939\u0948! \ud83c\udf6a\u2728`,
                        kn: `\u0ca8\u0cae\u0cb8\u0ccd\u0c95\u0cbe\u0cb0 <strong>${userName}</strong>! mingmorsels \u0c95\u0cc1\u0c95\u0cbf \u0cb8\u0c82\u0c97\u0ccd\u0cb0\u0cb9\u0c95\u0ccd\u0c95\u0c47 \u0cae\u0ca4\u0ccd\u0ca4\u0cca\u0cae\u0ccd\u0cae\u0cc6 \u0cb8\u0ccd\u0cb5\u0cbe\u0c97\u0ca4! \ud83c\udf6a\u2728`,
                        ta: `\u0bb5\u0ba3\u0b95\u0bcd\u0b95\u0bae\u0bcd <strong>${userName}</strong>! mingmorsels \u0b95\u0bc1\u0b95\u0bcd\u0b95\u0bbf \u0b9a\u0bc7\u0b95\u0bb0\u0bbf\u0baa\u0bcd\u0baa\u0bbf\u0bb1\u0bcd\u0b95\u0bc1 \u0bae\u0bc0\u0ba3\u0bcd\u0b9f\u0bc1\u0bae\u0bcd \u0bb5\u0bb0\u0bc7\u0bb1\u0bcd\u0b95\u0bbf\u0bb1\u0bcb\u0bae\u0bcd! \ud83c\udf6a\u2728`,
                        te: `\u0c28\u0c2e\u0c38\u0c4d\u0c15\u0c3e\u0c30\u0c02 <strong>${userName}</strong>! mingmorsels \u0c15\u0c41\u0c15\u0c40\u0c32 \u0c38\u0c47\u0c15\u0c30\u0c23\u0c15\u0c41 \u0c24\u0c30\u0c3f\u0c17\u0c3f \u0c38\u0c4d\u0c35\u0c3e\u0c17\u0c24\u0c02! \ud83c\udf6a\u2728`,
                        ar: `\u0645\u0631\u062d\u0628\u0627\u064b <strong>${userName}</strong>! \u0623\u0647\u0644\u0627\u064b \u0628\u0643 \u0645\u062c\u062f\u062f\u0627\u064b \u0641\u064a \u0645\u062c\u0645\u0648\u0639\u0629 \u0628\u0633\u0643\u0648\u064a\u062a mingmorsels! \ud83c\udf6a\u2728`
                    };
                    return { text: greetings[lang] || greetings.en };
                }
                return { text: getLangText('hello', lang) };
            }
            // AI Intent Recognition: Store Pickup & Sunday Operating Schedule
            if (/pickup|store pickup|collect|studio|timings|timing|sunday|holiday|hours|opening hours/.test(q)) {
                return {
                    text: `🏪 <strong>Store Pickup &amp; Experience Studio Hours</strong><br><br>• <strong>Pickup Window:</strong> 10:00 AM – 4:00 PM (Monday through Saturday).<br>• <strong>Sunday Holiday:</strong> Store pickup is closed on Sundays. Orders placed on Sunday will be freshly baked and ready for pickup on <strong>Monday between 10:00 AM and 4:00 PM</strong>.<br>• <strong>Studio Address:</strong> 1st A Main Road, SLV Layout, Phase 3, Nayanda Halli, Bengaluru 560026.<br><br>You'll receive a secure 4-digit pickup PIN as soon as your cookies are fresh from the oven! 🍪`
                };
            }

            // AI Intent Recognition: Connoisseur Reward Points & VIP 1000 Milestone
            if (/reward|point|points|vip|gift box|1000|loyalty|milestone|bonus/.test(q)) {
                return {
                    text: `👑 <strong>mingmorsels VIP Rewards &amp; Milestone Box</strong><br><br>• <strong>Earn +100 Points:</strong> Automatically credited with every order you place.<br>• <strong>1,000 Points Milestone:</strong> When you reach 1,000 reward points, you unlock an exclusive, complimentary <strong>Chef's Special Artisanal Gift Box</strong> included free with your next order.<br><br>Track your points live anytime in your account dashboard! ✨`
                };
            }

            // AI Intent Recognition: Gift Boxes & Packaging
            if (/gift|box|package|packaging|hamper|gifting|present|tin|lush|signature|box builder/.test(q)) {
                if (/muffin.*lush|lush.*muffin/.test(q)) {
                    return {
                        text: `⚠️ <strong>Muffin Packaging Note:</strong><br>Our soft-baked muffins cannot fit inside the <strong>Lush Luxury Box</strong>.<br>Please select our <strong>Signature Treat Box (+₹15)</strong> which fits up to 10 cookies and muffins together!<br><br><button onclick="openGiftBuilder()" style="background:linear-gradient(135deg, #FFDF79 0%, #D4AF37 50%, #996515 100%); border:none; color:#120E0B; padding:8px 16px; border-radius:8px; font-weight:800; cursor:pointer;">🎁 Open Gift Box Builder</button>`
                    };
                }

                return {
                    text: `🎁 <strong>Handcrafted Luxury Gift Boxes</strong><br><br>We offer two premium packaging options:<br>• <strong>Signature Gable Box (+₹15)</strong>: Holds up to <strong>10 cookies &amp; muffins</strong> in our classic royal orange box.<br>• <strong>Lush Luxury Box (+₹130)</strong>: Holds up to <strong>4 cookies + Roasted Dry Fruits pouch</strong> in a blush floral keepsake case (muffins excluded).<br><br><button onclick="openGiftBuilder()" style="background:linear-gradient(135deg, #FFDF79 0%, #D4AF37 50%, #996515 100%); border:none; color:#120E0B; padding:8px 16px; border-radius:8px; font-weight:800; cursor:pointer;">🎁 Build Custom Gift Box</button>`
                };
            }

            // AI Intent Recognition: Bulk Inquiries & Corporate Quotes
            if (/bulk|corporate|wedding|wholesale|event|party|50 box|100 box|large order|discount/.test(q)) {
                return {
                    text: `🏢 <strong>Corporate &amp; Event Bulk Orders</strong><br>We offer up to <strong>35% volume savings</strong> with custom luxury packaging and personalized sommelier cards for corporate gifting and weddings!<br><br>👉 <a href="/bulk-order.html" target="_top" style="color:var(--gold); font-weight:bold; text-decoration:underline;">Click here to open our Instant Bulk Price Calculator</a>.`
                };
            }

            // AI Intent Recognition: Order Tracking & Shipway Status
            if (/track|where is my order|status|delivery|shipway|awb|courier|dispatch/.test(q)) {
                return {
                    text: `📦 <strong>Real-Time Order &amp; Shipment Tracking</strong><br>Track your order live with real-time temperature and location updates via Shipway / BlueDart Air Logistics.<br><br>👉 <a href="/track-order.html" target="_top" style="color:var(--gold); font-weight:bold; text-decoration:underline;">Click here to open Live Order Tracking Portal</a>.`
                };
            }

            // AI Intent Recognition: Box Options & Packaging Sizes
            if (/box option|box options|box size|box sizes|different box|packaging option|pack size|snack pack|classic box|classic delights|family pack|dozen delight|dozen delights|twin delight|twin delights|how many cookies|how many pieces|box choices/.test(q)) {
                return {
                    text: `📦 <strong>Available Box Sizes &amp; Packaging Choices</strong><br><br>Every flavour is freshly baked and packed in airtight gold-foil packaging across 3 distinct sizes:<br><br>• <strong>Twin Delights (2 Pieces)</strong>: Perfect for personal snacking &amp; quick cravings (from ₹40).<br>• <strong>Classic Delights (8 Cookies / 4 Muffins)</strong>: Our #1 Bestseller — ideal for teatime sharing &amp; family dessert (from ₹140).<br>• <strong>Dozen Delights (12 Cookies / 6 Muffins)</strong>: Premium presentation box for parties and celebrations (from ₹210).<br><br>Tap on any flavour card below to pick your box size and add to cart! ✦`,
                    cards: ['almond', 'walnut_sf', 'rose'].map(k => renderCookieCard(k)).join('')
                };
            }

            // AI Intent Recognition: Nutrition & Dietary Information
            if (/nutrition|nutritional|calorie|calories|protein|fat|sugar content|carbs|macros|macro|healthy facts/.test(q)) {
                return {
                    text: `🥗 <strong>100% Pure &amp; Wholesome Nutrition</strong><br><br>All mingmorsels treats are handcrafted with zero palm oil, zero margarine, and clean real ingredients:<br><br>• <strong>Sugar-Free Walnut</strong>: 128 kcal · 0g Sugar · 4.8g Protein · 3.5g Fibre<br>• <strong>Almond Rich</strong>: 72.7 kcal · 1.51g Protein · 5.14g Healthy Fats<br>• <strong>Oats &amp; Nuts</strong>: 148 kcal · 5g Protein · 3.2g Fibre (High Energy)<br>• <strong>Rose Petal</strong>: 135 kcal · Low GI Damask Rose Extract<br><br>Check out the full nutrition certificates on the cards below:`,
                    cards: ['walnut_sf', 'oatsnuts', 'almond'].map(k => renderCookieCard(k)).join('')
                };
            }

            // AI Intent Recognition: Smart Recommendation
            if (/recommend|suggest|which one|best seller|favorite|popular|top|pairing/.test(q)) {
                return {
                    text: `✨ <strong>Sommelier's Bestseller Recommendation</strong><br>Our #1 most-loved pairing is <strong>Almond Rich Cookies</strong> (buttery &amp; nutty crunch) paired with our <strong>70% Belgian Dark Chocochip Muffin</strong>!<br><br>Want a personalized flavour match? <button onclick="window.top.document.getElementById('btn-open-flavor-quiz')?.click()" style="background:linear-gradient(135deg, #FFDF79 0%, #D4AF37 50%, #996515 100%); border:none; color:#120E0B; padding:8px 16px; border-radius:8px; font-weight:800; cursor:pointer;">Take AI Flavour Quiz</button>`,
                    card: 'almond'
                };
            }

            return { text: getLangText('fallback', lang) };
        }

        function appendMsg(html, isUser) {
            const area = document.getElementById('chatArea');
            const d = document.createElement('div');
            d.className = 'msg' + (isUser ? ' user' : '');
            const av = document.createElement('div');
            av.className = 'avatar ' + (isUser ? 'user' : 'bot');
            av.textContent = isUser ? 'You' : '';
            const bubble = document.createElement('div');
            bubble.className = 'bubble ' + (isUser ? 'user' : 'bot');
            bubble.innerHTML = html.replace(/\n/g, '<br>');
            if (isUser) { d.appendChild(bubble); d.appendChild(av); } else { d.appendChild(av); d.appendChild(bubble); }
            area.appendChild(d);
            area.scrollTop = area.scrollHeight;
            return d;
        }

        function showTyping() { const area = document.getElementById('chatArea'); const d = document.createElement('div'); d.className = 'msg'; d.id = 'typing'; d.innerHTML = `<div class="avatar bot"></div><div class="bubble bot"><div class="typing"><div class="dot"></div><div class="dot"></div><div class="dot"></div></div></div>`; area.appendChild(d); area.scrollTop = area.scrollHeight; }
        function removeTyping() { const t = document.getElementById('typing'); if (t) t.remove(); }

        function appendBotResponse(reply) {
            removeTyping();
            const area = document.getElementById('chatArea');
            const d = document.createElement('div');
            d.className = 'msg';
            const av = document.createElement('div');
            av.className = 'avatar bot'; av.textContent = '';
            const bubble = document.createElement('div');
            bubble.className = 'bubble bot';
            let html = reply.text.replace(/\n/g, '<br>');
            if (reply.langPill) { const langNames = { en: 'English', hi: 'हिन्दी', kn: 'ಕನ್ನಡ', ta: 'தமிழ்', te: 'తెలుగు', ar: 'عربي' }; html = `<div class="lang-pill">${LANGS[reply.langPill].flag} ${langNames[reply.langPill]}</div>` + html; }
            if (reply.card) html += renderCookieCard(reply.card);
            if (reply.cards) html += reply.cards;
            bubble.innerHTML = html;
            d.appendChild(av); d.appendChild(bubble);
            area.appendChild(d);
            area.scrollTop = area.scrollHeight;
            speakText(reply.text);
        }

        function sendMessage(override) {
            const input = document.getElementById('userInput');
            const msg = override || input.value.trim();
            if (!msg) return;
            input.value = '';
            appendMsg(msg, true);
            showTyping();
            setTimeout(() => { const reply = getBotReply(msg); appendBotResponse(reply); }, 700 + Math.random() * 400);
        }

        function askAbout(name) { sendMessage('Tell me about ' + name); }

        try {
            const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
            if (SR) {
                recognition = new SR();
                recognition.continuous = false; recognition.interimResults = false; recognition.lang = 'en-US';
                recognition.onstart = () => { isListening = true; const m = document.getElementById('micBtn'); if (m) { m.classList.add('listening'); m.title = "Listening..."; } const inp = document.getElementById('userInput'); if (inp) inp.placeholder = "Listening..."; };
                recognition.onresult = (e) => { const t = e.results[0][0].transcript; const inp = document.getElementById('userInput'); if (inp) { inp.value = t; sendMessage(); } };
                recognition.onerror = () => resetMicBtn();
                recognition.onend = () => resetMicBtn();
            } else { const m = document.getElementById('micBtn'); if (m) m.style.display = 'none'; }
        } catch (e) { console.error(e); }

        function resetMicBtn() { isListening = false; const m = document.getElementById('micBtn'); if (m) { m.classList.remove('listening'); m.title = "Speak"; } const inp = document.getElementById('userInput'); const t = TRANSLATIONS[currentLang]; if (inp && t) inp.placeholder = t.placeholder; }
        function toggleListening() { if (!recognition) return; if (isListening) { recognition.stop(); } else { _speechSessionId++; _clearSpeechKeepAlive(); if (window.speechSynthesis) window.speechSynthesis.cancel(); recognition.start(); } }

        function toggleVoiceOutput() {
            voiceEnabled = !voiceEnabled;
            const btn = document.getElementById('voiceToggle');
            if (btn) {
                btn.classList.toggle('active', voiceEnabled);
                if (voiceEnabled) { btn.innerHTML = `<svg viewBox="0 0 24 24"><path d="M11 5L6 9H2v6h4l5 4V5z"/><path d="M19.07 4.93a10 10 0 0 1 0 14.14M15.54 8.46a5 5 0 0 1 0 7.07"/></svg>`; speakText("Voice guide enabled!"); }
                else { btn.innerHTML = `<svg viewBox="0 0 24 24"><path d="M11 5L6 9H2v6h4l5 4V5z"/><line x1="23" y1="9" x2="17" y2="15"/><line x1="17" y1="9" x2="23" y2="15"/></svg>`; _speechSessionId++; _clearSpeechKeepAlive(); if (window.speechSynthesis) window.speechSynthesis.cancel(); }
            }
        }

        function getFemaleVoice(lang, voices) {
            let list = voices;
            if (!list || list.length === 0) {
                list = allVoices;
            }
            if (!list || list.length === 0) {
                if (window.speechSynthesis) {
                    list = window.speechSynthesis.getVoices();
                }
            }
            if (!list || list.length === 0) {
                return null;
            }

            const langPrefix = lang ? lang.split('-')[0].toLowerCase() : 'en';

            // Filter voices by target language prefix
            let langVoices = list.filter(v => v.lang && v.lang.toLowerCase().startsWith(langPrefix));

            // If no voice for the target language, fall back to 'en'
            if (langVoices.length === 0 && langPrefix !== 'en') {
                langVoices = list.filter(v => v.lang && v.lang.toLowerCase().startsWith('en'));
            }

            // If still no voices, use the entire list of voices
            if (langVoices.length === 0) {
                langVoices = list;
            }

            const femalePreferences = {
                en: [
                    "siri", "samantha (enhanced)", "samantha", "aria online", "jenny online",
                    "google uk english female", "google us english", "google uk english",
                    "karen", "moira", "fiona", "tessa", "veena", "susan", "hazel", "zira"
                ],
                hi: [
                    "siri", "lekha (enhanced)", "lekha", "veena", "google हिन्दी", "google hindi",
                    "kalpana", "heera", "swara online", "madhur online"
                ],
                ta: [
                    "siri", "vani (enhanced)", "vani", "google தமிழ்", "google tamil", "vani online"
                ],
                te: [
                    "siri", "gita", "google తెలుగు", "google telugu", "shruti online"
                ],
                kn: [
                    "siri", "google ಕನ್ನಡ", "google kannada", "sapna online"
                ],
                ar: [
                    "siri", "laila (enhanced)", "laila", "mouna", "google العربية", "google arabic",
                    "hoda online", "salma online"
                ]
            };

            const prefs = femalePreferences[langPrefix] || femalePreferences['en'];

            // Score each voice based on gender, Siri/quality keywords, and priority lists
            const scoredVoices = langVoices.map(v => {
                const nameLower = (v.name || '').toLowerCase();
                let score = 0;

                // 1. Gender classification (prefer female)
                const isMale = MALE_NAMES_EXCLUDE.some(m => nameLower.includes(m));
                if (isMale) {
                    score -= 500; // Penalty for male voices, but kept as a absolute last resort fallback
                } else {
                    score += 100; // Bonus for female voices
                }

                // 2. High-quality voice markers
                if (nameLower.includes("siri")) {
                    score += 200; // Siri voice gets highest priority
                }
                if (nameLower.includes("enhanced") || nameLower.includes("premium")) {
                    score += 150; // Enhanced/premium quality on macOS/iOS
                }
                if (nameLower.includes("natural")) {
                    score += 80;
                }
                if (nameLower.includes("online") && !isMale) {
                    score += 60; // Microsoft Edge Online voices
                }
                if (nameLower.includes("google") && !isMale) {
                    score += 50; // Google TTS voices
                }

                // 3. Language preference list matching
                for (let i = 0; i < prefs.length; i++) {
                    if (nameLower.includes(prefs[i])) {
                        score += (100 - i * 5); // Points based on rank in prefs
                        break;
                    }
                }

                // 4. localService check (on-device Apple Siri voices)
                if (v.localService) {
                    score += 10;
                }

                return { voice: v, score: score };
            });

            // Sort voices by score descending
            scoredVoices.sort((a, b) => b.score - a.score);

            if (scoredVoices.length > 0) {
                return scoredVoices[0].voice;
            }

            return null;
        }

        function _clearSpeechKeepAlive() {
            if (_speechKeepAlive) { clearInterval(_speechKeepAlive); _speechKeepAlive = null; }
        }

        function speakText(text) {
            if (!voiceEnabled || !window.speechSynthesis) return;

            // Increment session ID to invalidate any previous speech chain
            const sessionId = ++_speechSessionId;

            window.speechSynthesis.cancel();
            _clearSpeechKeepAlive();

            // Split into lines first to handle list formatting
            const lines = text.split('\n').map(l => l.trim()).filter(l => l.length > 0);

            // Clean each line and ensure proper punctuation for natural pauses
            const cleanedLines = [];
            for (const line of lines) {
                let clean = line.replace(/<[^>]*>/g, "");
                clean = clean
                    .replace(/\p{Extended_Pictographic}/gu, "")
                    .replace(/[\u{1F300}-\u{1F9FF}]|[\u{1F600}-\u{1F64F}]|[\u{1F680}-\u{1F6FF}]|[\u{2600}-\u{26FF}]|[\u{2700}-\u{27BF}]|[\u{1F1E6}-\u{1F1FF}]|[\u{1F191}-\u{1F251}]|[\u{1F900}-\u{1F9FF}]/gu, "")
                    .replace(/✦/g, "")
                    .replace(/\s+/g, " ")
                    .trim();

                if (!clean) continue;

                // Add a period at the end of the line if it doesn't already end with punctuation
                if (!/[.!?,:;]$/.test(clean)) {
                    clean += ".";
                }
                cleanedLines.push(clean);
            }

            if (cleanedLines.length === 0) return;

            const voices = window.speechSynthesis.getVoices();
            const v = getFemaleVoice(currentLang, voices);
            if (!v) {
                console.warn("No voice found for speech synthesis.");
                return;
            }

            // Split lines into sentence-sized chunks for speech synthesis
            const chunks = [];
            for (const line of cleanedLines) {
                const sentences = line.match(/[^.!?]+[.!?]?/g) || [line];
                for (const s of sentences) {
                    const trimmed = s.trim();
                    if (trimmed) {
                        chunks.push(trimmed);
                    }
                }
            }

            if (chunks.length === 0) return;

            // Chrome bug workaround: periodic resume() prevents the engine from auto-pausing
            _speechKeepAlive = setInterval(() => {
                if (_speechSessionId !== sessionId) { _clearSpeechKeepAlive(); return; }
                if (window.speechSynthesis.speaking && !window.speechSynthesis.paused) {
                    window.speechSynthesis.pause();
                    window.speechSynthesis.resume();
                }
            }, 5000);

            const langPrefix = currentLang ? currentLang.split('-')[0].toLowerCase() : 'en';

            let idx = 0;
            function speakNext() {
                // If a newer speakText call happened, stop this chain immediately
                if (_speechSessionId !== sessionId) return;
                if (idx >= chunks.length) { _clearSpeechKeepAlive(); return; }
                const u = new SpeechSynthesisUtterance(chunks[idx]);
                u.voice = v;
                u.lang = v.lang;

                // Slightly slower speech rate for better clarity, adjusted by language
                u.rate = (langPrefix === 'hi' || langPrefix === 'ta' || langPrefix === 'te' || langPrefix === 'kn') ? 0.88 : 0.92;

                // Adjust pitch slightly higher for female voices, but keep neutral (1.0) if falling back to male voice
                const nameLower = (v.name || '').toLowerCase();
                const isMale = MALE_NAMES_EXCLUDE.some(m => nameLower.includes(m));
                u.pitch = isMale ? 1.0 : 1.08;

                u.onend = function () {
                    // Guard: only continue if this session is still active
                    if (_speechSessionId !== sessionId) return;
                    idx++;
                    speakNext();
                };
                u.onerror = function () {
                    if (_speechSessionId === sessionId) _clearSpeechKeepAlive();
                };
                window.speechSynthesis.speak(u);
            }
            speakNext();
        }

        (function () {
            const area = document.getElementById('chatArea');
            const btn = document.getElementById('backToTop');
            if (!area || !btn) return;
            area.addEventListener('scroll', function () { if (area.scrollTop > 300) btn.classList.add('visible'); else btn.classList.remove('visible'); });
        })();

        function scrollChatToTop() { document.getElementById('chatArea').scrollTo({ top: 0, behavior: 'smooth' }); }

        const HISTORY_KEY = 'mm-chat-history';
        let currentSessionId = Date.now().toString();
        let sessionMessages = [];

        function saveMessageToHistory(text, isUser) {
            sessionMessages.push({ text, isUser, ts: Date.now() });
            const all = getAllSessions();
            all[currentSessionId] = { id: currentSessionId, startTs: parseInt(currentSessionId), messages: sessionMessages };
            customLocalStorage.setItem(HISTORY_KEY, JSON.stringify(all));
        }

        function getAllSessions() { try { return JSON.parse(customLocalStorage.getItem(HISTORY_KEY)) || {}; } catch (e) { return {}; } }
        function openHistory() { renderHistoryList(); document.getElementById('historyOverlay').classList.add('open'); }
        function closeHistory() { document.getElementById('historyOverlay').classList.remove('open'); }
        function handleHistoryOverlayClick(e) { if (e.target === document.getElementById('historyOverlay')) closeHistory(); }

        function renderHistoryList() {
            const list = document.getElementById('historyList');
            const all = getAllSessions();
            const sessions = Object.values(all).sort((a, b) => b.startTs - a.startTs);
            if (!sessions.length) { list.innerHTML = '<div class="history-empty"><div class="history-empty-icon">💬</div>No saved chats yet.<br>Start chatting to save history!</div>'; return; }
            list.innerHTML = sessions.map(s => {
                const date = new Date(s.startTs).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
                const first = s.messages.find(m => m.isUser);
                const preview = first ? first.text.substring(0, 55) + (first.text.length > 55 ? '...' : '') : 'New conversation';
                const active = s.id === currentSessionId ? ' style="border-color:var(--gold)"' : '';
                return `<div class="history-session"${active} onclick="loadSession('${s.id}')"><div class="history-session-date">${date} &bull; ${s.messages.length} messages</div><div class="history-session-preview">${preview}</div></div>`;
            }).join('');
        }

        function loadSession(id) {
            const all = getAllSessions();
            const session = all[id];
            if (!session) return;
            currentSessionId = id;
            sessionMessages = session.messages;
            const area = document.getElementById('chatArea');
            area.innerHTML = '';
            session.messages.forEach(m => {
                if (m.isUser) appendMsg(m.text, true);
                else { const d = document.createElement('div'); d.className = 'msg'; const av = document.createElement('div'); av.className = 'avatar bot'; const bubble = document.createElement('div'); bubble.className = 'bubble bot'; bubble.innerHTML = m.text.replace(/\n/g, '<br>'); d.appendChild(av); d.appendChild(bubble); area.appendChild(d); }
            });
            area.scrollTop = area.scrollHeight;
            closeHistory();
        }

        function newSession() {
            currentSessionId = Date.now().toString();
            sessionMessages = [];
            const area = document.getElementById('chatArea');
            area.innerHTML = '';
            const d = document.createElement('div'); d.className = 'msg';
            const av = document.createElement('div'); av.className = 'avatar bot';
            const bubble = document.createElement('div'); bubble.className = 'bubble bot';
            bubble.innerHTML = TRANSLATIONS[currentLang].welcome || TRANSLATIONS['en'].welcome;
            d.appendChild(av); d.appendChild(bubble);
            area.appendChild(d);
            closeHistory();
        }

        function clearAllHistory() {
            if (!confirm('Clear all chat history? This cannot be undone.')) return;
            customLocalStorage.removeItem(HISTORY_KEY);
            currentSessionId = Date.now().toString();
            sessionMessages = [];
            renderHistoryList();
        }

        const _origSend = sendMessage;
        sendMessage = function (override) {
            const input = document.getElementById('userInput');
            const msg = override || (input ? input.value.trim() : '');
            if (input && !override) {
                input.value = '';
            }
            if (msg) {
                try {
                    saveMessageToHistory(msg, true);
                } catch (e) {
                    console.error("Error saving message to history:", e);
                }
            }
            _origSend(msg);
        };

        const _origBot = appendBotResponse;
        appendBotResponse = function (reply) {
            _origBot(reply);
            if (reply && reply.text) {
                try {
                    saveMessageToHistory(reply.text, false);
                } catch (e) {
                    console.error("Error saving bot response to history:", e);
                }
            }
        };

        const GIFT_SIZES = { classic: 10, lush: 4 };
        const GIFT_BOX_EXTRA = { classic: 15, lush: 130 };
        const GIFT_BOX_NAMES = { classic: 'Signature Treat Box (+₹15)', lush: 'Lush Luxury Box (+₹130)' };
        let giftSelected = {};
        let giftSize = 'classic';

        function addGiftBoxToCart() {
            const total = Object.values(giftSelected).reduce((a, b) => a + b, 0);
            if (!total) { alert('Please select at least one treat for your gift box!'); return; }
            
            const isLush = giftSize === 'lush';
            const extraPrice = GIFT_BOX_EXTRA[giftSize] || 15;
            const boxName = GIFT_BOX_NAMES[giftSize] || 'Signature Treat Box';
            const boxImg = isLush ? '/box-lush.jpg' : '/box-classic.jpg';

            let itemsTotal = 0;
            const items = Object.entries(giftSelected).filter(([, q]) => q > 0).map(([k, q]) => {
                const itemPrice = COOKIE_PRICES[k] || 150;
                itemsTotal += itemPrice * q;
                return q + 'x ' + (COOKIES[k] ? COOKIES[k].name : k);
            }).join(', ');

            const msg = document.getElementById('giftMessage').value.trim();
            
            let cartData = [];
            try { cartData = JSON.parse(localStorage.getItem('ming_morsels_cart') || '[]'); } catch { cartData = []; }
            cartData.push({
                id: 'custom_giftbox_' + Date.now(),
                name: `${boxName} (${total} items${isLush ? ' + Dry Fruits' : ''})`,
                price: itemsTotal + extraPrice,
                quantity: 1,
                isCustom: true,
                image: boxImg,
                packaging: boxName,
                boxImage: boxImg,
                customDetails: items + (isLush ? ' + Premium Dry Fruits Pouch' : ''),
                customNote: msg
            });
            localStorage.setItem('ming_morsels_cart', JSON.stringify(cartData));
            alert(`🎁 ${boxName} added to your basket!`);
            closeGiftBuilder();
            window.parent.postMessage({ type: 'CHATBOT_OPEN_CART' }, '*');
        }

        function closeGiftBuilder() { document.getElementById('giftOverlay').classList.remove('open'); }
        function handleGiftOverlayClick(e) { if (e.target === document.getElementById('giftOverlay')) closeGiftBuilder(); }

        function selectSize(size, el) {
            giftSize = size;
            document.querySelectorAll('.gift-size-btn').forEach(b => b.classList.remove('selected'));
            el.classList.add('selected');
            
            const max = GIFT_SIZES[size] || 10;
            document.getElementById('giftMaxCount').textContent = max;

            const banner = document.getElementById('lushDryFruitsChatBanner');
            if (banner) banner.style.display = size === 'lush' ? 'block' : 'none';

            // If switching to lush, remove any muffin selections
            if (size === 'lush') {
                ['strawberry', 'pinacolada', 'butterscotch', 'chocochip', 'blackcurrant'].forEach(mKey => {
                    delete giftSelected[mKey];
                });
            }

            trimGiftToMax();
            buildGiftGrid();
            updateGiftSummary();
        }

        function buildGiftGrid() {
            const grid = document.getElementById('giftCookieGrid');
            const isLush = giftSize === 'lush';
            
            grid.innerHTML = Object.entries(COOKIES).map(([key, c]) => {
                // If Lush box, hide muffins completely
                const isMuffin = ['strawberry', 'pinacolada', 'butterscotch', 'chocochip', 'blackcurrant'].includes(key);
                if (isLush && isMuffin) return '';

                const qty = giftSelected[key] || 0;
                return `<div class="gift-cookie-tile ${qty > 0 ? 'selected' : ''}" id="gtile-${key}"><span class="tile-count" id="gcount-${key}">${qty}</span><span class="tile-emoji">${c.emoji}</span><div class="tile-name">${c.name.replace(' Cookies', '')}</div><div class="gift-tile-controls"><button class="gift-tile-btn" onclick="giftAdjust('${key}',-1)">−</button><span class="gift-tile-qty" id="gqty-${key}">${qty}</span><button class="gift-tile-btn" onclick="giftAdjust('${key}',1)">+</button></div></div>`;
            }).join('');
        }

        function giftAdjust(key, delta) {
            const max = GIFT_SIZES[giftSize] || 10;
            const total = Object.values(giftSelected).reduce((a, b) => a + b, 0);
            const current = giftSelected[key] || 0;
            const newVal = Math.max(0, current + delta);
            if (delta > 0 && total >= max) return;
            giftSelected[key] = newVal;
            if (!newVal) delete giftSelected[key];
            const tile = document.getElementById('gtile-' + key);
            const countEl = document.getElementById('gcount-' + key);
            const qtyEl = document.getElementById('gqty-' + key);
            if (tile) tile.classList.toggle('selected', newVal > 0);
            if (countEl) { countEl.textContent = newVal; }
            if (qtyEl) qtyEl.textContent = newVal;
            updateGiftSummary();
        }

        function trimGiftToMax() {
            const max = GIFT_SIZES[giftSize] || 10;
            let total = Object.values(giftSelected).reduce((a, b) => a + b, 0);
            while (total > max) { const keys = Object.keys(giftSelected); if (!keys.length) break; const k = keys[keys.length - 1]; giftSelected[k]--; if (!giftSelected[k]) delete giftSelected[k]; total--; }
            buildGiftGrid();
        }

        function updateGiftSummary() {
            const total = Object.values(giftSelected).reduce((a, b) => a + b, 0);
            const max = GIFT_SIZES[giftSize] || 10;
            const isLush = giftSize === 'lush';
            document.getElementById('giftTotalCount').textContent = total;
            document.getElementById('giftMaxCount').textContent = max;
            let items = Object.entries(giftSelected).filter(([, q]) => q > 0).map(([k, q]) => (COOKIES[k] ? COOKIES[k].emoji : '🍪') + ' x' + q).join('  ');
            if (isLush && total > 0) items += ' + 🥜 Dry Fruits Pouch';
            document.getElementById('giftSummaryItems').textContent = items || 'Pick treats to fill your box!';
        }

        function resetGiftBox() {
            giftSelected = {}; giftSize = 'classic';
            document.querySelectorAll('.gift-size-btn').forEach(b => b.classList.remove('selected'));
            const first = document.querySelector('.gift-size-btn[data-size="classic"]');
            if (first) first.classList.add('selected');
            const banner = document.getElementById('lushDryFruitsChatBanner');
            if (banner) banner.style.display = 'none';
            document.getElementById('giftMessage').value = '';
            buildGiftGrid(); updateGiftSummary();
        }

        function sendGiftToWhatsApp() {
            const total = Object.values(giftSelected).reduce((a, b) => a + b, 0);
            if (!total) { alert('Please select at least one cookie!'); return; }
            const sizeNames = { small: 'Mini (4)', medium: 'Classic (8)', large: 'Grand (12)' };
            const items = Object.entries(giftSelected).filter(([, q]) => q > 0).map(([k, q]) => q + 'x ' + COOKIES[k].name).join(', ');
            const msg = document.getElementById('giftMessage').value.trim();
            let text = `Hello mingmorsels! I'd like to order a Gift Box 🎁%0A%0ABox: ${sizeNames[giftSize]}%0ACookies: ${items.replace(/ /g, '%20')}%0A`;
            if (msg) text += `Message: "${msg.replace(/ /g, '%20')}"%0A`;
            text += `%0APlease confirm availability and pricing. Thank you!`;
            window.open('https://wa.me/918884102020?text=' + text, '_blank');
        }

        let cart = [];
        let favorites = [];
        let reviews = {};
        let cookieViews = {};
        let boutiqueCategory = 'all';
        let activeTagFilters = new Set();

        let couponCode = "";
        let discountRate = 0;
        let selectedQVRating = 5;
        let currentQVKey = "";
        let currentQVTab = "nut";

        const COOKIE_PRICES = { almond: 40, rose: 40, oatsnuts: 40, orange: 40, walnut: 40, walnut_sf: 40, strawberry: 40, pinacolada: 40, butterscotch: 40, chocochip: 40, blackcurrant: 40 };
        const LOCAL_IMAGES = { almond: "/almond/1.jpg", rose: "/rose-petal/1.jpg", oatsnuts: "/oats-nuts/1.jpg", orange: "/orange-peel/1.jpg", walnut: "/sugarfree_walnut_cookie.png", walnut_sf: "/sugarfree_walnut_cookie.png", strawberry: "/img-strawberry.jpg", pinacolada: "/img-pinacolada.jpg", butterscotch: "/img-butterscotch.jpg", chocochip: "/img-chocochip.jpg", blackcurrant: "/img-blackcurrant.jpg" };

        // ── Merge a main-site cart (array of {id,quantity,...}) into chatbot's cart ──
        function mergeMainCart(mainCartItems) {
            if (!Array.isArray(mainCartItems)) return;
            mainCartItems.forEach(item => {
                const key = item.id || item.key;
                if (!key) return;
                const qty = parseInt(item.quantity ?? item.qty ?? 1, 10) || 0;
                if (qty <= 0) return;
                const existing = cart.find(c => c.key === key);
                if (existing) {
                    existing.qty = qty;  // Main site is source of truth for quantity
                } else {
                    cart.push({ key, qty });
                }
            });
            // Remove items that main site deleted (qty reached 0)
            const mainKeys = mainCartItems.filter(i => (parseInt(i.quantity ?? i.qty ?? 1) || 0) > 0).map(i => i.id || i.key).filter(Boolean);
            cart = cart.filter(c => mainKeys.includes(c.key));
        }

        function initStoreState() {
            try { cart = JSON.parse(customLocalStorage.getItem('mm-cart')) || []; favorites = JSON.parse(customLocalStorage.getItem('mm-favorites')) || []; reviews = JSON.parse(customLocalStorage.getItem('mm-reviews')) || {}; cookieViews = JSON.parse(customLocalStorage.getItem('mm-cookie-views')) || {}; } catch (e) { console.error('Storage error:', e); }
            // Also merge items from the shared main-site cart so the chatbot
            // cart drawer reflects anything added outside the chatbot.
            try {
                const mainRaw = JSON.parse(localStorage.getItem('ming_morsels_cart') || '[]');
                if (Array.isArray(mainRaw) && mainRaw.length > 0) mergeMainCart(mainRaw);
            } catch (e) { /* ignore */ }
            updateCartUI(); updateBoutiqueGrid(); updateFavoritesBadge();
            document.body.classList.add('custom-cursor');
        }

        function saveStoreState() {
            customLocalStorage.setItem('mm-cart', JSON.stringify(cart));
            customLocalStorage.setItem('mm-favorites', JSON.stringify(favorites));
            customLocalStorage.setItem('mm-reviews', JSON.stringify(reviews));
            customLocalStorage.setItem('mm-cookie-views', JSON.stringify(cookieViews));
            // Sync to main site cart format so parent page picks it up
            const mainCart = cart.map(item => {
                const info = COOKIES[item.key];
                return {
                    id: item.key,
                    name: info ? info.name : item.key,
                    quantity: item.qty,
                    price: info ? (info.price || 149) : 149
                };
            });
            try { localStorage.setItem('ming_morsels_cart', JSON.stringify(mainCart)); } catch (e) { }
            // Notify parent window via postMessage (works for same-tab iframes)
            try { window.parent.postMessage({ type: 'CHATBOT_CART_UPDATED', cart: mainCart }, '*'); } catch (e) { }
        }

        function switchTab(tab) {
            const isChat = tab === 'chat';
            document.getElementById('tabChatBtn').classList.toggle('active', isChat);
            document.getElementById('tabBoutiqueBtn').classList.toggle('active', !isChat);
            document.getElementById('chatArea').style.display = isChat ? 'flex' : 'none';
            document.querySelector('.input-row').style.display = isChat ? 'flex' : 'none';
            document.querySelector('.cookie-strip').style.display = isChat ? 'flex' : 'none';
            document.querySelector('.mood-banner').style.display = isChat ? 'block' : 'none';
            document.getElementById('boutiqueSection').style.display = isChat ? 'none' : 'flex';
            if (!isChat) { updateBoutiqueGrid(); initSeasonalCarousel(); }
        }

        let carouselIndex = 0;
        let carouselInterval = null;

        function initSeasonalCarousel() {
            if (carouselInterval) clearInterval(carouselInterval);
            setCarouselSlide(0);
            carouselInterval = setInterval(() => { carouselIndex = (carouselIndex + 1) % 3; setCarouselSlide(carouselIndex); }, 5000);
        }

        function setCarouselSlide(idx) {
            carouselIndex = idx;
            const track = document.getElementById('carouselTrack');
            if (track) track.style.transform = `translateX(-${idx * 100}%)`;
            document.querySelectorAll('.carousel-dot').forEach((dot, i) => dot.classList.toggle('active', i === idx));
        }

        let onlyShowFavs = false;

        function toggleBoutiqueFavsFilter() { onlyShowFavs = !onlyShowFavs; const ind = document.querySelector('.fav-indicator'); ind.style.borderColor = onlyShowFavs ? '#D9381E' : 'var(--border)'; updateBoutiqueGrid(); }
        function setBoutiqueCategory(cat, el) { boutiqueCategory = cat; document.querySelectorAll('.boutique-filter-chip').forEach(c => c.classList.remove('active')); el.classList.add('active'); updateBoutiqueGrid(); }
        function toggleTagFilter(tag, el) { if (activeTagFilters.has(tag)) { activeTagFilters.delete(tag); el.classList.remove('active'); } else { activeTagFilters.add(tag); el.classList.add('active'); } updateBoutiqueGrid(); }
        function filterBoutiqueProducts() { updateBoutiqueGrid(); }

        function updateBoutiqueGrid() {
            const grid = document.getElementById('boutiqueGrid');
            if (!grid) return;
            const searchVal = document.getElementById('boutiqueSearchInput').value.toLowerCase().trim();
            let matches = Object.entries(COOKIES).filter(([key, c]) => {
                if (searchVal) { const nameMatch = c.name.toLowerCase().includes(searchVal); const tagMatch = c.tags.some(t => t.toLowerCase().includes(searchVal)); const reviewMatch = c.review.toLowerCase().includes(searchVal); if (!nameMatch && !tagMatch && !reviewMatch) return false; }
                if (onlyShowFavs && !favorites.includes(key)) return false;
                if (boutiqueCategory !== 'all') { if (!c.tags.includes(boutiqueCategory)) return false; }
                if (activeTagFilters.size > 0) { const searchSpace = c.review.toLowerCase() + c.tags.join(" ").toLowerCase(); let tagMatched = false; for (let tag of activeTagFilters) { if (searchSpace.includes(tag.toLowerCase())) { tagMatched = true; break; } } if (!tagMatched) return false; }
                return true;
            });
            if (matches.length === 0) { grid.innerHTML = `<div style="grid-column: 1/-1; text-align: center; padding: 40px; color: var(--muted); font-size:12.5px;">🍪 No matching cookies found. try broadening your tags!</div>`; return; }
            grid.innerHTML = matches.map(([key, c]) => {
                const price = COOKIE_PRICES[key] || 150;
                const isFav = favorites.includes(key);
                const localImg = LOCAL_IMAGES[key] || c.img;
                const imgHTML = localImg ? `<img class="grid-card-img" src="${localImg}" alt="${c.name}" loading="lazy" onerror="this.onerror=null; this.src='${c.img || ''}'; if(!this.src) this.parentNode.innerHTML='<div class=\\'grid-card-img-placeholder\\' style=\\'background:${c.color}\\'>${c.emoji}</div>';">` : `<div class="grid-card-img-placeholder" style="background:${c.color}">${c.emoji}</div>`;
                const itemReviews = reviews[key] || [];
                const customSum = itemReviews.reduce((sum, r) => sum + r.rating, 0);
                const avg = itemReviews.length > 0 ? (customSum / itemReviews.length).toFixed(1) : "5.0";
                const stars = '★'.repeat(Math.round(parseFloat(avg))) + '☆'.repeat(5 - Math.round(parseFloat(avg)));
                return `<div class="grid-card" onclick="trackCookieView('${key}')"><div class="grid-card-img-wrapper" onclick="openQuickView('${key}'); event.stopPropagation();">${imgHTML}<button class="grid-card-heart ${isFav ? 'active' : ''}" onclick="toggleFavorite('${key}', this); event.stopPropagation();" title="Save Favorite"><svg viewBox="0 0 24 24"><path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/></svg></button><div class="grid-card-price-badge">₹${price} / pack</div></div><div class="grid-card-body" onclick="openQuickView('${key}'); event.stopPropagation();"><div class="grid-card-name">${c.emoji} ${c.name}</div><div class="grid-card-stars">${stars} (${avg})</div><div class="grid-card-review">${c.review}</div><div class="grid-card-footer"><button class="grid-card-btn grid-btn-details" onclick="openQuickView('${key}'); event.stopPropagation();">Info</button><button class="grid-card-btn grid-btn-cart" onclick="openChatbotBoxModal('${key}'); event.stopPropagation();">+ Add</button></div></div></div>`;
            }).join('');

        }

        let cbSelectedProductKey = 'almond';
        let cbSelectedBoxIndex = 1;
        let cbQuantity = 1;

        function openChatbotBoxModal(key) {
            const k = String(key || 'almond').trim().toLowerCase();
            
            // 1. If embedded inside main website iframe, trigger the main window modal directly!
            if (window.parent && window.parent !== window) {
                window.parent.postMessage({ type: 'OPEN_QUICK_ADD', productId: k }, '*');
            }
            if (window.top && typeof window.top.openQuickAddModal === 'function') {
                window.top.openQuickAddModal(k);
                return;
            }

            // 2. Otherwise open the built-in modal inside chatbot page
            const product = COOKIES[k] || COOKIES.almond;
            cbSelectedProductKey = k;
            cbSelectedBoxIndex = (product.boxes && product.boxes.findIndex(b => b.popular) !== -1) 
                ? product.boxes.findIndex(b => b.popular) 
                : 1;
            cbQuantity = 1;
            
            renderChatbotBoxCards();
            updateChatbotBoxFooter();
            
            const overlay = document.getElementById('chatbotBoxModalOverlay');
            if (overlay) {
                overlay.classList.add('open');
                overlay.style.display = 'flex';
            }
        }

        function closeChatbotBoxModal() {
            const overlay = document.getElementById('chatbotBoxModalOverlay');
            if (overlay) {
                overlay.classList.remove('open');
                overlay.style.display = 'none';
            }
        }

        function handleChatbotBoxOverlayClick(e) {
            if (e.target === document.getElementById('chatbotBoxModalOverlay')) {
                closeChatbotBoxModal();
            }
        }

        function renderChatbotBoxCards() {
            const container = document.getElementById('cb-qa-box-grid');
            const product = COOKIES[cbSelectedProductKey] || COOKIES.almond;
            if (!container || !product || !product.boxes) return;

            container.innerHTML = product.boxes.map((box, index) => {
                const isSelected = index === cbSelectedBoxIndex;
                const cardBorder = isSelected ? '2px solid #5B2C6F' : '1.5px solid #E8E0D7';
                const cardBg = isSelected ? '#FAF5FF' : '#FFFFFF';
                const cardShadow = isSelected ? '0 6px 20px rgba(91, 44, 111, 0.12)' : 'none';

                return `
                    <div onclick="selectChatbotBoxIndex(${index})" style="
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
                        <div style="
                            width: 100%;
                            height: 115px;
                            border-radius: 10px;
                            overflow: hidden;
                            position: relative;
                            background: #EFE9E0;
                            margin-bottom: 10px;
                        ">
                            <img src="${box.img}" alt="${box.name}" style="
                                width: 100%;
                                height: 100%;
                                object-fit: cover;
                                display: block;
                            " onerror="this.src='${product.img || '/almond/1.jpg'}'" />

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

                            <button onclick="openChatbotBoxLightbox('${box.img}', '${box.name}', '${box.count}'); event.stopPropagation();" style="
                                position: absolute;
                                bottom: 6px;
                                right: 6px;
                                background: rgba(20, 14, 10, 0.72);
                                color: #FFF;
                                border: none;
                                font-size: 10.5px;
                                font-weight: 600;
                                padding: 3px 8px;
                                border-radius: 12px;
                                cursor: pointer;
                                display: flex;
                                align-items: center;
                                gap: 3px;
                                backdrop-filter: blur(4px);
                            ">
                                <span>🔍 View Box</span>
                            </button>
                        </div>

                        <h4 style="margin: 0 0 3px; font-size: 14.5px; font-weight: 700; color: #2C1810;">${box.name}</h4>
                        <span style="font-size: 12.5px; font-weight: 700; color: #5B2C6F; margin-bottom: 6px; display: block;">${box.count}</span>
                        <div style="font-size: 17px; font-weight: 800; color: #2C1810; margin-top: auto;">₹${box.price}</div>
                    </div>
                `;
            }).join('');
        }

        function selectChatbotBoxIndex(idx) {
            cbSelectedBoxIndex = idx;
            renderChatbotBoxCards();
            updateChatbotBoxFooter();
        }

        function changeChatbotBoxQty(delta) {
            cbQuantity = Math.max(1, Math.min(50, cbQuantity + delta));
            updateChatbotBoxFooter();
        }

        function updateChatbotBoxFooter() {
            const product = COOKIES[cbSelectedProductKey] || COOKIES.almond;
            const box = (product.boxes && product.boxes[cbSelectedBoxIndex]) || { price: 140 };
            const total = box.price * cbQuantity;

            const qtyDisp = document.getElementById('cb-qa-qty-display');
            const totDisp = document.getElementById('cb-qa-total-price');
            if (qtyDisp) qtyDisp.textContent = cbQuantity;
            if (totDisp) totDisp.textContent = `₹${total}`;
        }

        function openChatbotBoxLightbox(img, title, desc) {
            const lb = document.getElementById('cb-qa-lightbox');
            const lbImg = document.getElementById('cb-qa-lightbox-img');
            const lbTitle = document.getElementById('cb-qa-lightbox-title');
            const lbDesc = document.getElementById('cb-qa-lightbox-desc');
            if (lb && lbImg) {
                lbImg.src = img;
                if (lbTitle) lbTitle.textContent = title;
                if (lbDesc) lbDesc.textContent = desc;
                lb.style.display = 'flex';
            }
        }

        function confirmChatbotBoxAddToCart() {
            const product = COOKIES[cbSelectedProductKey] || COOKIES.almond;
            const box = (product.boxes && product.boxes[cbSelectedBoxIndex]) || (product.boxes && product.boxes[0]) || { id: cbSelectedProductKey, name: 'Classic Delights', price: 140, count: '8 Cookies' };

            // 1. Add to parent website CartStore if in iframe
            if (window.top && window.top.cartStore) {
                window.top.cartStore.addItem({
                    id: box.id,
                    productId: cbSelectedProductKey,
                    name: `${product.name} (${box.name} - ${box.count})`,
                    price: box.price,
                    quantity: cbQuantity,
                    image: box.img || product.img,
                    packaging: box.name
                });
                if (window.top.uiController) {
                    window.top.uiController.openCartDrawer();
                }
            }

            // 2. Post message to parent window
            window.parent.postMessage({
                type: 'ADD_TO_CART',
                item: {
                    id: box.id,
                    productId: cbSelectedProductKey,
                    name: `${product.name} (${box.name} - ${box.count})`,
                    price: box.price,
                    quantity: cbQuantity,
                    image: box.img || product.img
                }
            }, '*');

            // 3. Update internal chatbot cart
            const existing = cart.find(i => i.key === box.id);
            if (existing) {
                existing.qty += cbQuantity;
            } else {
                cart.push({ key: box.id, name: `${product.name} (${box.name})`, price: box.price, qty: cbQuantity, image: box.img || product.img });
            }
            saveStoreState();
            updateCartUI();

            const badge = document.getElementById('cartBadgeCount');
            if (badge) {
                badge.classList.remove('bounce');
                void badge.offsetWidth;
                badge.classList.add('bounce');
            }

            closeChatbotBoxModal();
            showToast(`✓ Added ${cbQuantity}x ${box.name} to Cookie Basket!`);
        }

        function toggleFavorite(key, btn) {
            const idx = favorites.indexOf(key);
            if (idx === -1) { favorites.push(key); btn.classList.add('active'); showToast("💖 Saved to Favorites"); }
            else { favorites.splice(idx, 1); btn.classList.remove('active'); showToast("💔 Removed from Favorites"); }
            saveStoreState(); updateFavoritesBadge(); updateBoutiqueGrid();
        }

        function updateFavoritesBadge() { const badge = document.getElementById('favBadgeCount'); if (badge) { badge.textContent = favorites.length; badge.style.display = favorites.length > 0 ? 'flex' : 'none'; } }
        function openCart() {
            updateCartUI();
            document.getElementById('cartDrawerOverlay').classList.add('open');
        }
        function closeCart() { document.getElementById('cartDrawerOverlay').classList.remove('open'); }
        function handleCartOverlayClick(e) { if (e.target === document.getElementById('cartDrawerOverlay')) closeCart(); }

        function addCookieToCart(key) {
            openChatbotBoxModal(key);
        }

        function adjustCartQty(key, delta) { const item = cart.find(item => item.key === key); if (!item) return; item.qty += delta; if (item.qty <= 0) { cart = cart.filter(i => i.key !== key); } saveStoreState(); updateCartUI(); }
        function removeCartItem(key) { cart = cart.filter(i => i.key !== key); saveStoreState(); updateCartUI(); showToast("🗑️ Item removed"); }

        function applyCartCoupon() {
            const inp = document.getElementById('couponInput').value.trim().toUpperCase();
            const feedback = document.getElementById('couponFeedback');
            if (inp === 'MORSELS10') { couponCode = inp; discountRate = 10; feedback.className = "coupon-feedback success"; feedback.textContent = "✓ 10% coupon applied!"; }
            else if (inp === '') { couponCode = ""; discountRate = 0; feedback.textContent = ""; }
            else { feedback.className = "coupon-feedback error"; feedback.textContent = "✗ Invalid coupon code"; }
            updateCartUI();
        }

        function updateCartUI() {
            const body = document.getElementById('cartBody');
            if (!body) return;
            const totalItems = cart.reduce((sum, item) => sum + item.qty, 0);
            const badge = document.getElementById('cartBadgeCount');
            if (badge) { badge.textContent = totalItems; badge.style.display = totalItems > 0 ? 'flex' : 'none'; }
            if (cart.length === 0) { body.innerHTML = `<div class="cart-empty"><div class="cart-empty-icon">🛒</div>Your cart is empty.<br>Browse the boutique and add some wholesome cookies!</div>`; document.getElementById('cartSubtotal').textContent = "₹0"; document.getElementById('cartDiscountRow').style.display = "none"; document.getElementById('cartPackagingRow').style.display = "none"; document.getElementById('cartGrandTotal').textContent = "₹0"; return; }
            body.innerHTML = cart.map(item => { const c = COOKIES[item.key]; const price = COOKIE_PRICES[item.key] || 150; return `<div class="cart-item"><span class="cart-item-emoji">${c.emoji}</span><div class="cart-item-info"><div class="cart-item-name">${c.name}</div><div class="cart-item-price">₹${price} x ${item.qty}</div></div><div class="cart-item-controls"><button class="cart-qty-btn" onclick="adjustCartQty('${item.key}', -1)">−</button><span class="cart-item-qty">${item.qty}</span><button class="cart-qty-btn" onclick="adjustCartQty('${item.key}', 1)">+</button></div><button class="cart-item-remove" onclick="removeCartItem('${item.key}')" title="Remove Item"><svg viewBox="0 0 24 24"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg></button></div>`; }).join('');
            let subtotal = cart.reduce((sum, item) => sum + (COOKIE_PRICES[item.key] || 150) * item.qty, 0);
            let discount = Math.round(subtotal * (discountRate / 100));
            let packaging = document.getElementById('giftWrapCheckbox').checked ? 50 : 0;
            let grandTotal = subtotal - discount + packaging;
            document.getElementById('cartSubtotal').textContent = `₹${subtotal}`;
            const discRow = document.getElementById('cartDiscountRow');
            if (discountRate > 0) { discRow.style.display = 'flex'; document.getElementById('discountPercentage').textContent = discountRate; document.getElementById('cartDiscount').textContent = `−₹${discount}`; } else { discRow.style.display = 'none'; }
            const packRow = document.getElementById('cartPackagingRow');
            if (packaging > 0) { packRow.style.display = 'flex'; } else { packRow.style.display = 'none'; }
            document.getElementById('cartGrandTotal').textContent = `₹${grandTotal}`;
        }

        function openCartFromChatbot() {
            if (cart.length === 0) { alert('Your basket is empty!'); return; }
            window.parent.postMessage({ type: 'CHATBOT_OPEN_CART' }, '*');
        }

        function openQuickView(key) {
            currentQVKey = key; currentQVTab = "nut"; selectedQVRating = 5;
            const c = COOKIES[key]; const price = COOKIE_PRICES[key] || 150;
            document.getElementById('qvName').textContent = c.name;
            document.getElementById('qvPrice').textContent = `₹${price} / pack`;
            document.getElementById('qvReview').textContent = c.review;
            const imgArea = document.getElementById('qvImageArea');
            const localImg = LOCAL_IMAGES[key] || c.img;
            if (localImg) { imgArea.innerHTML = `<img class="qv-hero-img" src="${localImg}" alt="${c.name}" onerror="this.onerror=null; this.src='${c.img || ''}'; if(!this.src) this.parentNode.innerHTML='<div class=\\'qv-hero-placeholder\\' style=\\'background:${c.color}\\'>${c.emoji}</div>';">`; }
            else { imgArea.innerHTML = `<div class="qv-hero-placeholder" style="background:${c.color}">${c.emoji}</div>`; }
            document.getElementById('quickViewModalOverlay').classList.add('open');
            switchQVTab('nut'); drawQVQRCode(key);
        }

        function closeQuickView() { document.getElementById('quickViewModalOverlay').classList.remove('open'); }
        function handleQuickViewOverlayClick(e) { if (e.target === document.getElementById('quickViewModalOverlay')) closeQuickView(); }

        function switchQVTab(tab) {
            currentQVTab = tab;
            document.getElementById('qvTabNut').classList.toggle('active', tab === 'nut');
            document.getElementById('qvTabReviews').classList.toggle('active', tab === 'reviews');
            document.getElementById('qvTabShare').classList.toggle('active', tab === 'share');
            document.getElementById('qvContentNut').classList.toggle('active', tab === 'nut');
            document.getElementById('qvContentReviews').classList.toggle('active', tab === 'reviews');
            document.getElementById('qvContentShare').classList.toggle('active', tab === 'share');
            if (tab === 'nut') populateQVNutrition();
            if (tab === 'reviews') populateQVReviews();
        }

        function populateQVNutrition() {
            const list = document.getElementById('qvNutritionList');
            const c = COOKIES[currentQVKey];
            const dailyRef = { Calories: "2000 kcal", Carbs: "300g", Protein: "50g", Fat: "65g", Sugar: "50g", Fibre: "25g", Sodium: "2000mg" };
            list.innerHTML = Object.entries(c.nutrition).map(([k, v]) => { let pctText = ""; if (dailyRef[k]) { const valNum = parseFloat(v); const refNum = parseFloat(dailyRef[k]); if (!isNaN(valNum) && !isNaN(refNum)) { const pct = Math.round((valNum / refNum) * 100); pctText = `<span style="font-size:9.5px; background:var(--warm); border-radius:4px; padding:2px 5px; margin-left:8px; font-weight:600; color:var(--muted);">${pct}% DV</span>`; } } return `<div class="nut-row-qv"><span class="nut-qv-label">${k}</span><span class="nut-qv-val">${v} ${pctText}</span></div>`; }).join('');
        }

        function populateQVReviews() {
            const list = document.getElementById('qvReviewsList');
            const custom = reviews[currentQVKey] || [];
            const defaults = [{ name: "Suresh K.", rating: 5, comment: `Absolutely phenomenal taste. Wholesome standard of quality!`, date: "May 24, 2026" }, { name: "Anita Rao", rating: 5, comment: `So glad to enjoy these natural sugar-free options. High fibre crunch!`, date: "May 25, 2026" }];
            const all = [...defaults, ...custom];
            list.innerHTML = all.map(r => { const stars = '★'.repeat(r.rating) + '☆'.repeat(5 - r.rating); return `<div class="qv-review-item"><div class="qv-review-item-header"><span class="qv-review-author">${r.name}</span><span class="qv-review-stars">${stars}</span></div><div class="qv-review-text">"${r.comment}" <span style="font-size:8.5px; color:var(--muted); font-style:italic;">&bull; ${r.date}</span></div></div>`; }).join('');
            setQVSurveyRating(5); document.getElementById('qvReviewAuthorInput').value = ""; document.getElementById('qvReviewCommentInput').value = "";
        }

        function setQVSurveyRating(val) { selectedQVRating = val; document.querySelectorAll('#qvStarsPicker span').forEach((s, idx) => s.classList.toggle('active', idx < val)); }

        function submitQVCookieReview() {
            const name = document.getElementById('qvReviewAuthorInput').value.trim();
            const comment = document.getElementById('qvReviewCommentInput').value.trim();
            if (!name || !comment) { alert("Please provide both your name and review feedback!"); return; }
            if (!reviews[currentQVKey]) reviews[currentQVKey] = [];
            reviews[currentQVKey].push({ name, rating: selectedQVRating, comment, date: new Date().toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) });
            saveStoreState(); populateQVReviews(); updateBoutiqueGrid(); showToast("✓ Review submitted successfully!");
        }

        function addQVCookieToCart() { addCookieToCart(currentQVKey); closeQuickView(); }

        function drawQVQRCode(key) {
            const canvas = document.getElementById('qvQrCanvas');
            if (!canvas) return;
            const ctx = canvas.getContext('2d');
            ctx.clearRect(0, 0, canvas.width, canvas.height);
            ctx.fillStyle = "#3D2000"; ctx.strokeRect(4, 4, canvas.width - 8, canvas.height - 8); ctx.lineWidth = 2;
            ctx.fillRect(8, 8, 20, 20); ctx.clearRect(12, 12, 12, 12); ctx.fillRect(14, 14, 8, 8);
            ctx.fillRect(canvas.width - 28, 8, 20, 20); ctx.clearRect(canvas.width - 24, 12, 12, 12); ctx.fillRect(canvas.width - 22, 14, 8, 8);
            ctx.fillRect(8, canvas.height - 28, 20, 20); ctx.clearRect(12, canvas.height - 24, 12, 12); ctx.fillRect(14, canvas.height - 22, 8, 8);
            for (let x = 32; x < canvas.width - 8; x += 6) { for (let y = 32; y < canvas.height - 8; y += 6) { const hash = (key.charCodeAt(0) * x + key.charCodeAt(1) * y) % 17; if (hash > 7) { ctx.fillRect(x, y, 4, 4); } } }
            ctx.font = "14px Arial"; ctx.fillText("🍪", canvas.width / 2 - 7, canvas.height / 2 + 5);
        }

        function shareQVCardSocial(platform) {
            const c = COOKIES[currentQVKey];
            const desc = `${c.emoji} ${c.name} by mingmorsels — wholesome, natural, handcrafted!`;
            const link = "https://wa.me/918884102020";
            let url = "";
            if (platform === 'whatsapp') url = `https://wa.me/918884102020?text=Check%20out%20these%20delicious%20${c.name}!%20${desc}`;
            else if (platform === 'sms') url = `sms:?body=Check%20out%20these%20delicious%20${c.name}!%20${desc}%20Order%3A%20${link}`;
            else if (platform === 'email') url = `mailto:?subject=Delicious%20Cookies%20-%20${c.name}&body=Hey!%20Check%20out%20these%20natural%20handcrafted%20cookies%20from%20mingmorsels%3A%20${c.name}.%0A%0ADescription%3A%20${c.review}%0A%0AOrder%20link%3A%20${link}`;
            else if (platform === 'twitter') url = `https://twitter.com/intent/tweet?text=Loving%20these%20natural%20${c.name}%20from%20%40mingmorsels!%20Wholesome%20perfection.%20🍪%20Order%3A%20${link}`;
            if (url) window.open(url, '_blank');
        }

        function copyQVLinkFallback() { const c = COOKIES[currentQVKey]; const text = `${c.name} by mingmorsels 🍪\n100% natural, preservative free!\nOrder: https://wa.me/918884102020`; navigator.clipboard.writeText(text).then(() => { showToast("📋 Link copied to clipboard!"); }).catch(() => showToast("⚠️ Clipboard not supported")); }
        function exportQVRecipePDF() { window.print(); }
        function trackCookieView(key) { cookieViews[key] = (cookieViews[key] || 0) + 1; saveStoreState(); }

        function openAnalytics() {
            const totalViews = Object.values(cookieViews).reduce((a, b) => a + b, 0);
            document.getElementById('anTotalViews').textContent = totalViews;
            let favKey = "None"; let maxVal = 0;
            for (let [k, val] of Object.entries(cookieViews)) { if (val > maxVal) { maxVal = val; favKey = COOKIES[k] ? COOKIES[k].name : k; } }
            document.getElementById('anFavItem').textContent = favKey.replace(' Cookies', '');
            document.getElementById('anTotalFavorites').textContent = favorites.length;
            document.getElementById('anCartItemsCount').textContent = cart.reduce((sum, i) => sum + i.qty, 0);
            const profileText = document.getElementById('anPersonalizedProfile');
            if (favorites.length === 0 && totalViews === 0) { profileText.textContent = "Explore our cookies or save some favorites to generate your taste profile!"; }
            else {
                let tagFreq = {};
                favorites.forEach(k => { if (COOKIES[k]) { COOKIES[k].tags.forEach(t => { tagFreq[t] = (tagFreq[t] || 0) + 2; }); } });
                Object.keys(cookieViews).forEach(k => { if (COOKIES[k]) { COOKIES[k].tags.forEach(t => { tagFreq[t] = (tagFreq[t] || 0) + 1; }); } });
                let topTag = "Natural & Wholesome"; let topScore = 0;
                for (let [t, score] of Object.entries(tagFreq)) { if (score > topScore) { topScore = score; topTag = t; } }
                profileText.innerHTML = `You are a <strong>${topTag}</strong> cookie lover! We recommend our signature <strong>${favKey !== "None" ? favKey : "Rose Petal"}</strong> cookies! 🍪✨`;
            }
            document.getElementById('analyticsModalOverlay').classList.add('open');
        }

        function closeAnalytics() { document.getElementById('analyticsModalOverlay').classList.remove('open'); }
        function handleAnalyticsOverlayClick(e) { if (e.target === document.getElementById('analyticsModalOverlay')) closeAnalytics(); }

        // Unregister any active service worker and clear caches to ensure the updated code loads fresh
        if ('serviceWorker' in navigator) {
            navigator.serviceWorker.getRegistrations().then(function (registrations) {
                for (let registration of registrations) {
                    registration.unregister();
                }
            }).catch(err => console.log('SW unregister failed:', err));
        }
        if ('caches' in window) {
            caches.keys().then(function (names) {
                for (let name of names) {
                    caches.delete(name);
                }
            }).catch(err => console.log('Cache clear failed:', err));
        }

        window.addEventListener('DOMContentLoaded', () => { initStoreState(); });

        // ── Receive live cart updates from the parent page ──────────────────────
        window.addEventListener('message', (e) => {
            if (!e.data || typeof e.data !== 'object') return;
            if (e.data.type === 'MAIN_CART_UPDATED') {
                try {
                    mergeMainCart(e.data.cart || []);
                    saveStoreState();
                    updateCartUI();
                } catch (err) { console.warn('Cart sync error:', err); }
            }
        });

        /* ===== SPELL-OUT mingmorsels ===== */
        function spellOutTitle() {
            const tooltip = document.getElementById('spellTooltip');
            tooltip.classList.add('visible');
            _speechSessionId++; _clearSpeechKeepAlive();
            if (window.speechSynthesis) window.speechSynthesis.cancel();

            if (window.speechSynthesis) {
                const u = new SpeechSynthesisUtterance('mingmorsels');
                const voices = window.speechSynthesis.getVoices();
                const v = getFemaleVoice('en', voices);
                if (!v) {
                    console.warn("No voice found for spelling out the title.");
                    setTimeout(() => tooltip.classList.remove('visible'), 1500);
                    return;
                }
                u.voice = v;
                u.lang = v.lang;
                u.rate = 0.85;

                // Adjust pitch slightly higher for female voices, but keep neutral (1.0) if falling back to male voice
                const nameLower = (v.name || '').toLowerCase();
                const isMale = MALE_NAMES_EXCLUDE.some(m => nameLower.includes(m));
                u.pitch = isMale ? 1.0 : 1.08;

                u.onend = () => setTimeout(() => tooltip.classList.remove('visible'), 1200);
                window.speechSynthesis.speak(u);
            } else {
                setTimeout(() => tooltip.classList.remove('visible'), 1500);
            }
        }

    

        function buildOffscreenCard(key) {
            const c = COOKIES[key];
            const stars = '★'.repeat(c.stars) + '☆'.repeat(5 - c.stars);
            const nutRows = Object.entries(c.nutrition).map(([k, v]) =>
                `<div style="background:#F5ECD7;border-radius:8px;padding:8px 6px;text-align:center;flex:1;min-width:0">
            <div style="font-size:13px;font-weight:700;color:#3D2000;font-family:Georgia,serif">${v}</div>
            <div style="font-size:10px;color:#8B6840;margin-top:2px">${k}</div>
        </div>`
            ).join('');
            const tags = c.tags.map(t =>
                `<span style="display:inline-block;background:#E8F5E1;color:#2E6B1A;font-size:10px;padding:3px 9px;border-radius:20px;margin:3px 2px;border:1px solid #BDE0A8;font-weight:600">${t}</span>`
            ).join('');
            const imgSection = c.img
                ? `<img src="${c.img}" crossOrigin="anonymous" style="width:100%;height:160px;object-fit:cover;display:block" onerror="this.style.display='none'">`
                : `<div style="width:100%;height:160px;background:${c.color};display:flex;align-items:center;justify-content:center;font-size:64px">${c.emoji}</div>`;

            return `
    <div style="width:400px;background:#FDF8F2;font-family:'DM Sans',Arial,sans-serif;border-radius:20px;overflow:hidden;border:1px solid #E8D5B0;box-shadow:0 8px 40px rgba(0,0,0,0.12)">
        ${imgSection}
        <div style="padding:18px 18px 14px">
            <div style="color:#C8960C;font-size:15px;margin-bottom:4px">${stars} (5.0)</div>
            <div style="font-family:Georgia,serif;font-size:20px;color:#3D2000;margin-bottom:8px">${c.emoji} ${c.name}</div>
            <div style="font-size:12px;color:#8B6840;line-height:1.6;margin-bottom:14px">${c.review}</div>
            <div style="display:flex;flex-wrap:wrap;gap:6px;margin-bottom:14px">${nutRows}</div>
            <div style="margin-bottom:14px">${tags}</div>
            <div style="border-top:1px solid #E8D5B0;padding-top:12px;display:flex;align-items:center;justify-content:space-between">
                <div style="font-family:Georgia,serif;font-size:13px;color:#6B3A0F;font-style:italic">mingmorsels · Natural · Handcrafted</div>
                <div style="font-size:11px;color:#8B6840">wa.me/918884102020</div>
            </div>
        </div>
    </div>`;
        }

        function showToast(msg, duration) {
            const t = document.getElementById('mmToast');
            t.textContent = msg;
            t.classList.add('show');
            setTimeout(() => t.classList.remove('show'), duration || 2500);
        }

        async function downloadCookieCard(key, cardUid) {
            const c = COOKIES[key];
            const zone = document.getElementById('cardRenderZone');
            zone.innerHTML = buildOffscreenCard(key);
            const el = zone.firstElementChild;
            showToast('⏳ Preparing image…', 4000);
            try {
                await new Promise(r => setTimeout(r, 300));
                const canvas = await html2canvas(el, { scale: 2, useCORS: true, allowTaint: false, backgroundColor: '#FDF8F2', logging: false });
                zone.innerHTML = '';
                const link = document.createElement('a');
                link.download = c.name.replace(/ /g, '_') + '_mingmorsels.png?v=2';
                link.href = canvas.toDataURL('image/png');
                link.click();
                showToast('✅ Card downloaded!');
            } catch (err) {
                zone.innerHTML = '';
                showToast('⚠️ Download failed. Try again.');
                console.error(err);
            }
        }

        async function shareCookieCard(key, cardUid) {
            const c = COOKIES[key];
            const shareBtn = document.getElementById('sharebtn-' + cardUid);
            if (navigator.canShare) {
                const zone = document.getElementById('cardRenderZone');
                zone.innerHTML = buildOffscreenCard(key);
                const el = zone.firstElementChild;
                showToast('⏳ Preparing…', 3000);
                try {
                    await new Promise(r => setTimeout(r, 300));
                    const canvas = await html2canvas(el, { scale: 2, useCORS: true, backgroundColor: '#FDF8F2', logging: false });
                    zone.innerHTML = '';
                    canvas.toBlob(async (blob) => {
                        const file = new File([blob], c.name.replace(/ /g, '_') + '_mingmorsels.png?v=2', { type: 'image/png' });
                        if (navigator.canShare({ files: [file] })) {
                            try {
                                await navigator.share({ title: c.name + ' — mingmorsels', text: c.name + ': ' + c.review.substring(0, 80) + '… Order: wa.me/918884102020', files: [file] });
                                showToast('✅ Shared!');
                            } catch (e) { fallbackCopy(key, cardUid, shareBtn); }
                        } else { fallbackCopy(key, cardUid, shareBtn); }
                    }, 'image/png');
                    return;
                } catch (err) { zone.innerHTML = ''; }
            }
            fallbackCopy(key, cardUid, shareBtn);
        }

        function fallbackCopy(key, cardUid, shareBtn) {
            const c = COOKIES[key];
            const text = c.name + ' by mingmorsels 🍪\n' + c.review.substring(0, 100) + '…\nOrder: https://wa.me/918884102020';
            navigator.clipboard.writeText(text).then(() => {
                if (shareBtn) { shareBtn.textContent = '✓ Copied!'; shareBtn.classList.add('copied'); setTimeout(() => { shareBtn.innerHTML = '<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/><line x1="8.59" y1="13.51" x2="15.42" y2="17.49"/><line x1="15.41" y1="6.51" x2="8.59" y2="10.49"/></svg> Share'; shareBtn.classList.remove('copied'); }, 2500); }
                showToast('📋 Link copied to clipboard!');
            }).catch(() => showToast('⚠️ Copy not supported on this device'));
        }

    
