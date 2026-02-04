import express from 'express';
import { authenticate } from '../middleware/auth.js';
import {
  listAllocations,
  getAllocation,
  createAllocation,
  updateAllocation,
  deleteAllocation,
  getSuggestions
} from '../controllers/allocations.js';

const router = express.Router();

// All routes require authentication
router.use(authenticate);

router.get('/', listAllocations);
router.get('/suggestions/:promoterId/:brandId/:storeId', getSuggestions);
router.get('/:id', getAllocation);
router.post('/', createAllocation);
router.put('/:id', updateAllocation);
router.delete('/:id', deleteAllocation);

export default router;
