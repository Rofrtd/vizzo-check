import express from 'express';
import {
  listStores,
  createStore,
  getStore,
  updateStore,
  getAuthorizedStores
} from '../controllers/stores.js';
import { authenticate, requireRole } from '../middleware/auth.js';

const router = express.Router();

router.use(authenticate);

router.get('/', requireRole(['agency', 'system_admin']), listStores);
router.post('/', requireRole(['agency', 'system_admin']), createStore);
router.get('/authorized', getAuthorizedStores);
router.get('/:id', requireRole(['agency', 'system_admin']), getStore);
router.put('/:id', requireRole(['agency', 'system_admin']), updateStore);

export default router;
