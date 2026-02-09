import express from 'express';
import {
  listVisits,
  createVisit,
  getVisit,
  updateVisit,
  getMyVisits,
  updateVisitProductPhotos
} from '../controllers/visits.js';
import { authenticate, requireRole } from '../middleware/auth.js';

const router = express.Router();

router.use(authenticate);

router.get('/', requireRole(['agency', 'system_admin']), listVisits);
router.post('/', createVisit);
router.get('/my-visits', getMyVisits);
// More specific routes must come before generic :id routes
router.put('/:visitId/products/:productId/photos', requireRole(['agency', 'system_admin']), updateVisitProductPhotos);
router.get('/:id', requireRole(['agency', 'system_admin']), getVisit);
router.put('/:id', requireRole(['agency', 'system_admin']), updateVisit);

export default router;
