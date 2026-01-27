import express from 'express';
import {
  listPromoters,
  createPromoter,
  getPromoter,
  updatePromoter,
  toggleActive,
  getMyEarnings
} from '../controllers/promoters.js';
import { authenticate, requireRole } from '../middleware/auth.js';

const router = express.Router();

// All routes require authentication
router.use(authenticate);

// Promoter earnings (promoter only)
router.get('/earnings/my', getMyEarnings);

// Admin only routes
router.get('/', requireRole(['agency_admin']), listPromoters);
router.post('/', requireRole(['agency_admin']), createPromoter);
router.get('/:id', getPromoter);
router.put('/:id', requireRole(['agency_admin']), updatePromoter);
router.patch('/:id/active', requireRole(['agency_admin']), toggleActive);

export default router;
