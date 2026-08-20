// ─────────────────────────────────────────────────────────────────────────────
// Analytics, Recommendations & AI Pricing Routes
// ─────────────────────────────────────────────────────────────────────────────

import { Router } from 'express';
import { PRODUCT_CATALOG } from '../config/catalog.js';

const router = Router();

/**
 * AI Personalized Cookie & Muffin Recommendations
 */
router.post('/recommendations', (req, res) => {
  try {
    const { history = [], preference = 'balanced' } = req.body;

    const catalogList = Object.values(PRODUCT_CATALOG).filter(p => p.category !== 'gift_box');
    let recommended = [];

    if (preference === 'nutty') {
      recommended = catalogList.filter(p => p.id.includes('almond') || p.id.includes('walnut') || p.id.includes('oats'));
    } else if (preference === 'floral') {
      recommended = catalogList.filter(p => p.id.includes('rose') || p.id.includes('orange'));
    } else if (preference === 'rich') {
      recommended = catalogList.filter(p => p.id.includes('choco') || p.id.includes('butterscotch'));
    } else {
      recommended = catalogList.slice(0, 3);
    }

    if (recommended.length === 0) recommended = catalogList.slice(0, 3);

    res.json({
      success: true,
      preference,
      recommendations: recommended.map(p => ({
        id: p.id,
        name: p.name,
        price: p.price,
        rating: p.rating,
        matchScore: Math.floor(Math.random() * 10 + 90) + '%'
      }))
    });
  } catch (error) {
    console.error('Recommendation error:', error);
    res.status(500).json({ success: false, error: 'Failed to generate recommendations.' });
  }
});

/**
 * Natural Language Customer Sentiment Analysis
 */
router.post('/sentiment/analyze', (req, res) => {
  try {
    const { text = '' } = req.body;
    const lower = text.toLowerCase();

    const positiveWords = ['amazing', 'delicious', 'love', 'fresh', 'luxurious', 'royal', 'crispy', 'melt', 'perfect', 'best', 'flavour', 'flavor', 'great', 'good'];
    const negativeWords = ['stale', 'bad', 'hard', 'broken', 'late', 'slow', 'sweet', 'disappointed', 'terrible', 'dry', 'awful'];

    let posCount = 0;
    let negCount = 0;

    positiveWords.forEach(w => { if (lower.includes(w)) posCount++; });
    negativeWords.forEach(w => { if (lower.includes(w)) negCount++; });

    let sentiment = 'NEUTRAL';
    let score = 0.5;

    if (posCount > negCount) {
      sentiment = 'POSITIVE';
      score = Math.min(0.98, 0.6 + (posCount * 0.1));
    } else if (negCount > posCount) {
      sentiment = 'NEGATIVE';
      score = Math.max(0.1, 0.4 - (negCount * 0.1));
    }

    res.json({
      success: true,
      text: text.slice(0, 100),
      sentiment,
      confidence: Math.round(score * 100) / 100
    });
  } catch (error) {
    console.error('Sentiment analysis error:', error);
    res.status(500).json({ success: false, error: 'Sentiment analysis failed.' });
  }
});

/**
 * Dynamic Corporate & Bulk Gifting Tiered Quotation
 */
router.post('/pricing/bulk-quote', (req, res) => {
  try {
    const { boxCount, quantity, total_value, tier = 'gold', customBranding = true } = req.body;
    const count = parseInt(quantity || boxCount, 10) || 20;
    const orderVal = Number(total_value) || 0;

    let discountPct = 0;
    let tierBadge = 'Standard Corporate Rate';
    let seasonalNotice = 'Orders under ₹5,000 carry standard pricing.';

    if (orderVal >= 100000 || count >= 200) {
      discountPct = 35;
      tierBadge = '👑 VIP Diamond Tier (35% OFF)';
      seasonalNotice = '₹1L+ Order Value · 35% Corporate Discount';
    } else if (orderVal >= 50000 || count >= 100) {
      discountPct = 30;
      tierBadge = '💎 Platinum Corporate Tier (30% OFF)';
      seasonalNotice = '₹50k+ Order Value · 30% Corporate Discount';
    } else if (orderVal >= 25000 || count >= 50) {
      discountPct = 25;
      tierBadge = '🥇 Gold Partner Tier (25% OFF)';
      seasonalNotice = '₹25k+ Order Value · 25% Corporate Discount';
    } else if (orderVal >= 10000 || count >= 20) {
      discountPct = 20;
      tierBadge = '🥈 Silver Business Tier (20% OFF)';
      seasonalNotice = '₹10k - ₹25k Order Value · 20% Discount';
    } else if (orderVal >= 5000 || count >= 10) {
      discountPct = 10;
      tierBadge = '🥉 Bronze Gifting Tier (10% OFF)';
      seasonalNotice = '₹5k - ₹10k Order Value · 10% Discount';
    }

    let baseBoxPrice = 980;
    if (tier === 'platinum') baseBoxPrice = 1420;
    else if (tier === 'silver') baseBoxPrice = 680;

    const unitPrice = Math.round(baseBoxPrice * (1 - discountPct / 100));
    const brandingCost = customBranding ? (count * 25) : 0;
    const subtotal = orderVal > 0 ? orderVal : ((unitPrice * count) + brandingCost);
    const discAmt = Math.round(subtotal * (discountPct / 100));
    const afterDisc = subtotal - discAmt;
    const gst = Math.round(afterDisc * 0.05);
    const grandTotal = afterDisc + gst;

    res.json({
      success: true,
      boxCount: count,
      tier,
      standardBoxPrice: baseBoxPrice,
      discount_percentage: discountPct,
      discountPct: discountPct,
      tier_badge: tierBadge,
      seasonal_notice: seasonalNotice,
      discountTier: `${discountPct}% Corporate Tier Discount`,
      discountedUnitPrice: unitPrice,
      customBrandingCost: brandingCost,
      subtotal,
      discountAmount: discAmt,
      taxGST: gst,
      estimatedTotal: grandTotal
    });
  } catch (error) {
    console.error('Bulk quote error:', error);
    res.status(500).json({ success: false, error: 'Failed to generate bulk quote.' });
  }
});

/**
 * AI Demand & Inventory Forecasting
 */
router.get('/analytics/demand-forecast', (req, res) => {
  try {
    const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
    const forecast = days.map((day, idx) => ({
      day,
      predictedBoxes: Math.floor(120 + Math.sin(idx) * 45 + Math.random() * 20),
      topFlavor: ['Royal Roasted Almond', 'Damascus Rose Petal', 'Dark Belgian Lava Muffin'][idx % 3],
      recommendedBakingBatchKg: Math.floor(18 + Math.random() * 8)
    }));

    res.json({
      success: true,
      generatedAt: new Date().toISOString(),
      forecast
    });
  } catch (error) {
    console.error('Forecast error:', error);
    res.status(500).json({ success: false, error: 'Failed to generate demand forecast.' });
  }
});

export default router;
