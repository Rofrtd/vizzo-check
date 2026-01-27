import express from 'express';
import {
  listStores,
  createStore,
  getStore,
  updateStore,
  getAuthorizedStores
} from '../controllers/stores.js';
import { authenticate } from '../middleware/auth.js';

const router = express.Router();

router.use(authenticate);

router.get('/', listStores);
router.post('/', createStore);
router.get('/authorized', getAuthorizedStores);
router.get('/:id', getStore);
router.put('/:id', updateStore);

export default router;
