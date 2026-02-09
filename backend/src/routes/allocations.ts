import express from 'express';
import { authenticate, requireRole } from '../middleware/auth.js';
import {
  listAllocations,
  getAllocation,
  createAllocation,
  updateAllocation,
  deleteAllocation,
  getSuggestions
} from '../controllers/allocations.js';

const router = express.Router();

router.use(authenticate);
router.use(requireRole(['agency', 'system_admin']));

router.get('/', listAllocations);
router.get('/suggestions/:promoterId/:brandId/:storeId', getSuggestions);
router.get('/:id', getAllocation);
router.post('/', createAllocation);
router.put('/:id', updateAllocation);
router.delete('/:id', deleteAllocation);

export default router;
