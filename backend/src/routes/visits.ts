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

router.get('/', listVisits);
router.post('/', createVisit);
router.get('/my-visits', getMyVisits);
// More specific routes must come before generic :id routes
router.put('/:visitId/products/:productId/photos', updateVisitProductPhotos);
router.get('/:id', getVisit);
router.put('/:id', requireRole(['agency_admin']), updateVisit);

export default router;
