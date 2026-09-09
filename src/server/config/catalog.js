// ─────────────────────────────────────────────────────────────────────────────
// Authoritative Product Catalog & Coupon Rules (Single Source of Truth)
// ─────────────────────────────────────────────────────────────────────────────

export const PRODUCT_CATALOG = {
  // Artisanal Cookies
  'almond': {
    id: 'almond',
    name: 'Almond Rich Cookie',
    category: 'cookie',
    price: 140,
    unit: 'box (8 pcs)',
    stock: 120,
    rating: 4.9,
    description: 'Golden roasted California almonds embedded in browned butter shortbread with pure vanilla.'
  },
  'almond_snack_2pcs': {
    id: 'almond_snack_2pcs',
    name: 'Almond Rich Cookie (Twin Delights - 2 Pcs)',
    category: 'cookie',
    price: 40,
    unit: 'pack (2 pcs)',
    stock: 150,
    rating: 5.0,
    description: 'Pocket Twin Delights pack containing 2 artisanal roasted almond cookies.'
  },
  'almond_classic_8pcs': {
    id: 'almond_classic_8pcs',
    name: 'Almond Rich Cookie (Classic Delights - 8 Pcs)',
    category: 'cookie',
    price: 140,
    unit: 'box (8 pcs)',
    stock: 120,
    rating: 5.0,
    description: 'Standard brand box containing 8 freshly baked roasted almond cookies.'
  },
  'almond_family_12pcs': {
    id: 'almond_family_12pcs',
    name: 'Almond Rich Cookie (Dozen Delights - 12 Pcs)',
    category: 'cookie',
    price: 360,
    unit: 'box (12 pcs)',
    stock: 60,
    rating: 5.0,
    description: 'Large Dozen Delights box containing 12 freshly baked roasted almond cookies (300g).'
  },
  'rose': {
    id: 'rose',
    name: 'Rose Petal Cookie',
    category: 'cookie',
    price: 140,
    unit: 'box (8 pcs)',
    stock: 85,
    rating: 4.8,
    description: 'Candied Damascus rose petals infused with pure cardamom and crushed pistachios.'
  },
  'rose_snack_2pcs': {
    id: 'rose_snack_2pcs',
    name: 'Rose Petal Cookie (Twin Delights - 2 Pcs)',
    category: 'cookie',
    price: 40,
    unit: 'pack (2 pcs)',
    stock: 150,
    rating: 4.8,
    description: 'Pocket Twin Delights pack containing 2 artisanal rose petal cookies.'
  },
  'rose_classic_8pcs': {
    id: 'rose_classic_8pcs',
    name: 'Rose Petal Cookie (Classic Delights - 8 Pcs)',
    category: 'cookie',
    price: 140,
    unit: 'box (8 pcs)',
    stock: 85,
    rating: 4.9,
    description: 'Standard brand box containing 8 freshly baked rose petal cookies.'
  },
  'rose_family_12pcs': {
    id: 'rose_family_12pcs',
    name: 'Rose Petal Cookie (Dozen Delights - 12 Pcs)',
    category: 'cookie',
    price: 360,
    unit: 'box (12 pcs)',
    stock: 60,
    rating: 5.0,
    description: 'Large Dozen Delights box containing 12 freshly baked rose petal cookies (300g).'
  },
  'oatsnuts': {
    id: 'oatsnuts',
    name: 'Oats Nuts Cookie',
    category: 'cookie',
    price: 140,
    unit: 'box (8 pcs)',
    stock: 95,
    rating: 4.95,
    description: 'Rolled oats, California walnuts, chia seeds, and plant-based Stevia with pista-elaichi crunch.'
  },
  'oatsnuts_snack_2pcs': {
    id: 'oatsnuts_snack_2pcs',
    name: 'Oats Nuts Cookie (Twin Delights - 2 Pcs)',
    category: 'cookie',
    price: 40,
    unit: 'pack (2 pcs)',
    stock: 150,
    rating: 5.0,
    description: 'Pocket Twin Delights pack containing 2 nut-powered immunity booster oats cookies.'
  },
  'oatsnuts_classic_8pcs': {
    id: 'oatsnuts_classic_8pcs',
    name: 'Oats Nuts Cookie (Classic Delights - 8 Pcs)',
    category: 'cookie',
    price: 140,
    unit: 'box (8 pcs)',
    stock: 95,
    rating: 5.0,
    description: 'Standard brand box containing 8 freshly baked oats & nuts cookies with pista-elaichi blend.'
  },
  'oatsnuts_family_12pcs': {
    id: 'oatsnuts_family_12pcs',
    name: 'Oats Nuts Cookie (Dozen Delights - 12 Pcs)',
    category: 'cookie',
    price: 360,
    unit: 'box (12 pcs)',
    stock: 60,
    rating: 5.0,
    description: 'Large Dozen Delights box containing 12 freshly baked oats & nuts cookies (300g).'
  },
  'orange': {
    id: 'orange',
    name: 'Orange Peel Cookie',
    category: 'cookie',
    price: 140,
    unit: 'box (8 pcs)',
    stock: 90,
    rating: 4.88,
    description: 'Sun-ripened orange zest fused with warm Ceylon cinnamon for a vibrant citrus crunch.'
  },
  'orange_snack_2pcs': {
    id: 'orange_snack_2pcs',
    name: 'Orange Peel Cookie (Twin Delights - 2 Pcs)',
    category: 'cookie',
    price: 40,
    unit: 'pack (2 pcs)',
    stock: 150,
    rating: 5.0,
    description: 'Pocket Twin Delights pack containing 2 soft & chewy orange peel cookies enriched with Vitamin C.'
  },
  'orange_classic_8pcs': {
    id: 'orange_classic_8pcs',
    name: 'Orange Peel Cookie (Classic Delights - 8 Pcs)',
    category: 'cookie',
    price: 140,
    unit: 'box (8 pcs)',
    stock: 90,
    rating: 5.0,
    description: 'Standard brand box containing 8 freshly baked orange peel cookies (No Margarine).'
  },
  'walnut': {
    id: 'walnut',
    name: 'Walnut Cookies',
    category: 'cookie',
    price: 220,
    unit: 'box (6 pcs)',
    stock: 75,
    rating: 4.9,
    description: 'Slow-roasted whole California walnuts folded into buttery shortbread cookie dough.'
  },
  'walnut_sf': {
    id: 'walnut_sf',
    name: 'Sugarfree Walnut Cookies',
    category: 'cookie',
    price: 240,
    unit: 'box (6 pcs)',
    stock: 50,
    rating: 4.9,
    description: 'Diabetic-friendly sweetened with natural plant Stevia extract and California walnuts.'
  },

  // Artisanal Muffins
  'strawberry': {
    id: 'strawberry',
    name: 'Strawberry Muffin',
    category: 'muffin',
    price: 150,
    unit: 'box (4 pcs)',
    stock: 40,
    rating: 4.8,
    description: 'Fluffy whole-grain muffin crowned with homemade Mahabaleshwar strawberry compote.'
  },
  'pinacolada': {
    id: 'pinacolada',
    name: 'Pinacolada Muffin',
    category: 'muffin',
    price: 150,
    unit: 'box (4 pcs)',
    stock: 45,
    rating: 4.8,
    description: 'Tropical pineapple tidbits and toasted coconut flakes in moist butter sponge.'
  },
  'pineapple': {
    id: 'pineapple',
    name: 'Pineapple Muffin',
    category: 'muffin',
    price: 150,
    unit: 'box (4 pcs)',
    stock: 45,
    rating: 4.7,
    description: 'Juicy roasted golden pineapple morsels drizzled with warm brown sugar butter glaze.'
  },
  'butterscotch': {
    id: 'butterscotch',
    name: 'Butterscotch Muffin',
    category: 'muffin',
    price: 160,
    unit: 'box (4 pcs)',
    stock: 55,
    rating: 4.9,
    description: 'Artisanal crunchy butterscotch toffee and praline chunks folded in velvety caramel crumb.'
  },
  'choco': {
    id: 'choco',
    name: 'Chocochip Muffin',
    category: 'muffin',
    price: 175,
    unit: 'box (4 pcs)',
    stock: 90,
    rating: 5.0,
    description: 'Rich dark cocoa sponge loaded with molten Belgian chocolate chips.'
  },
  'chocochip': {
    id: 'chocochip',
    name: 'Chocochip Muffin',
    category: 'muffin',
    price: 175,
    unit: 'box (4 pcs)',
    stock: 90,
    rating: 5.0,
    description: 'Rich dark cocoa sponge loaded with molten Belgian chocolate chips.'
  },
  'blackcurrant': {
    id: 'blackcurrant',
    name: 'Blackcurrant Muffin',
    category: 'muffin',
    price: 150,
    unit: 'box (4 pcs)',
    stock: 50,
    rating: 4.85,
    description: 'Whole wheat muffin bursting with tangy black currants and vanilla flavour.'
  },

  // Custom Gift Box Base Tiers
  'gift_box_4': {
    id: 'gift_box_4',
    name: 'Artisanal Petite Box (4 Flavors)',
    category: 'gift_box',
    price: 680,
    stock: 200
  },
  'gift_box_6': {
    id: 'gift_box_6',
    name: 'Bespoke Connoisseur Box (6 Flavors)',
    category: 'gift_box',
    price: 980,
    stock: 200
  },
  'gift_box_9': {
    id: 'gift_box_9',
    name: 'Grand Royal Assortment (9 Flavors)',
    category: 'gift_box',
    price: 1420,
    stock: 150
  },
  'gift_box_12': {
    id: 'gift_box_12',
    name: 'Master Luxury Trunk (12 Flavors)',
    category: 'gift_box',
    price: 1850,
    stock: 100
  }
};

// Luxury Packaging Add-on Pricing (in INR)
export const PACKAGING_RATES = {
  'none': 0,
  'classic': 15,
  'lush': 130,
  'wooden': 120,
  'tin': 80,
  'velvet': 50
};

// Verified Coupon Rules
export const ACTIVE_COUPONS = {
  'FIRSTBITE': {
    code: 'FIRSTBITE',
    type: 'percentage',
    value: 15, // 15% discount
    maxDiscount: 100,
    minOrderValue: 300,
    description: '15% OFF for new connoisseurs (Max ₹100)'
  },
  'LUXURY50': {
    code: 'LUXURY50',
    type: 'flat',
    value: 50, // ₹50 flat discount
    maxDiscount: 50,
    minOrderValue: 400,
    description: 'Flat ₹50 OFF on orders above ₹400'
  },
  'SWEETDEAL': {
    code: 'SWEETDEAL',
    type: 'percentage',
    value: 10, // 10% discount
    maxDiscount: 75,
    minOrderValue: 250,
    description: '10% OFF on all baked goods (Max ₹75)'
  },
  'VIP20': {
    code: 'VIP20',
    type: 'percentage',
    value: 20, // 20% discount
    maxDiscount: 250,
    minOrderValue: 800,
    description: '20% Royal Connoisseur Discount (Max ₹250)'
  }
};
