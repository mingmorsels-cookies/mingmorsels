// ─────────────────────────────────────────────────────────────────────────────
// review.routes.js - Customer Reviews & Admin Moderation Endpoints
// ─────────────────────────────────────────────────────────────────────────────

import { Router } from 'express';
import { z } from 'zod';
import { verifyAdminAuth } from '../middleware/auth.js';
import {
  createReviewRecord,
  getApprovedReviews,
  getAllReviewsAdmin,
  updateReviewStatus,
  deleteReviewRecord
} from '../../../db.js';

const router = Router();

const reviewSchema = z.object({
  productId: z.string().min(1).default('rose'),
  name: z.string().min(2, 'Name must be at least 2 characters').max(60),
  email: z.string().email().optional().or(z.literal('')),
  location: z.string().max(60).optional().default('Bengaluru'),
  rating: z.number().int().min(1).max(5).default(5),
  text: z.string().min(3, 'Feedback must be at least 3 characters').max(1000)
});

// Helper for fast sentiment classification
function analyzeSentiment(text = '', rating = 5) {
  const lower = text.toLowerCase();
  const positive = ['love', 'amazing', 'delicious', 'fresh', 'best', 'flavour', 'flavor', 'perfect', 'crispy', 'divine', 'great', 'royal', 'sweet'];
  const negative = ['bad', 'stale', 'hard', 'broken', 'late', 'slow', 'dry', 'awful', 'terrible'];
  
  let score = 0;
  positive.forEach(w => { if (lower.includes(w)) score++; });
  negative.forEach(w => { if (lower.includes(w)) score--; });

  if (rating >= 5 && score >= 0) return '😍 LOVED IT';
  if (rating >= 4 || score > 0) return '🌟 VERIFIED CONNOISSEUR';
  if (score < 0 || rating <= 2) return '💬 VERIFIED FEEDBACK';
  return '👍 RECOMMENDED';
}

/**
 * Public: Submit a review (Saved as 'pending' moderation)
 */
router.post('/reviews/submit', async (req, res) => {
  try {
    const parsed = reviewSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({
        success: false,
        error: parsed.error.issues[0]?.message || 'Invalid review data'
      });
    }

    const { productId, name, email, location, rating, text } = parsed.data;
    const sentiment = analyzeSentiment(text, rating);

    const review = await createReviewRecord({
      productId,
      name,
      email: email || '',
      location: location || 'Bengaluru',
      rating,
      text,
      sentiment,
      verified: true
    });

    res.status(201).json({
      success: true,
      message: 'Thank you for your review! It has been submitted for moderation and will appear once verified by our team.',
      review
    });
  } catch (error) {
    console.error('Review Submission Error:', error);
    res.status(500).json({ success: false, error: 'Failed to submit review.' });
  }
});

/**
 * Public: Fetch approved reviews for a specific product
 */
router.get('/reviews/:productId', async (req, res) => {
  try {
    const { productId } = req.params;
    const reviews = await getApprovedReviews(productId);
    res.json({
      success: true,
      productId,
      count: reviews.length,
      reviews
    });
  } catch (error) {
    console.error('Get Product Reviews Error:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch reviews.' });
  }
});

/**
 * Admin: Get all reviews (Pending, Approved, Rejected)
 */
router.get('/admin/reviews', verifyAdminAuth, async (req, res) => {
  try {
    const reviews = await getAllReviewsAdmin();
    const pendingCount = reviews.filter(r => r.status === 'pending').length;
    const approvedCount = reviews.filter(r => r.status === 'approved').length;
    const rejectedCount = reviews.filter(r => r.status === 'rejected').length;

    res.json({
      success: true,
      count: reviews.length,
      stats: {
        total: reviews.length,
        pending: pendingCount,
        approved: approvedCount,
        rejected: rejectedCount
      },
      reviews
    });
  } catch (error) {
    console.error('Admin Reviews Error:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch reviews ledger.' });
  }
});

/**
 * Admin: Moderate a review (Approve / Reject)
 */
router.patch('/admin/reviews/:id/moderate', verifyAdminAuth, async (req, res) => {
  try {
    const { status } = req.body;
    if (!['pending', 'approved', 'rejected'].includes(status)) {
      return res.status(400).json({ success: false, error: 'Invalid moderation status.' });
    }

    const review = await updateReviewStatus(req.params.id, status);
    if (!review) {
      return res.status(404).json({ success: false, error: 'Review not found.' });
    }

    res.json({
      success: true,
      message: `Review #${review.id} successfully marked as ${status}.`,
      review
    });
  } catch (error) {
    console.error('Moderate Review Error:', error);
    res.status(500).json({ success: false, error: 'Failed to moderate review.' });
  }
});

/**
 * Admin: Permanently Delete a Review
 */
router.delete('/admin/reviews/:id', verifyAdminAuth, async (req, res) => {
  try {
    const deleted = await deleteReviewRecord(req.params.id);
    if (!deleted) {
      return res.status(404).json({ success: false, error: 'Review not found.' });
    }

    res.json({
      success: true,
      message: `Review #${req.params.id} deleted permanently.`
    });
  } catch (error) {
    console.error('Delete Review Error:', error);
    res.status(500).json({ success: false, error: 'Failed to delete review.' });
  }
});

export default router;
