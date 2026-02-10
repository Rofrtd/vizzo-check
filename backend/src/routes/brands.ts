import express from 'express';
import {
  listBrands,
  createBrand,
  getBrand,
  updateBrand,
  addProduct,
  updateProduct,
  deleteProduct,
  getAuthorizedBrandsForStore
} from '../controllers/brands.js';
import { authenticate, requireRole } from '../middleware/auth.js';

const router = express.Router();

router.use(authenticate);

router.get('/', requireRole(['agency', 'system_admin']), listBrands);
router.post('/', requireRole(['agency', 'system_admin']), createBrand);
router.get('/authorized/:storeId', getAuthorizedBrandsForStore);
router.get('/:id', requireRole(['agency', 'system_admin']), getBrand);
router.put('/:id', requireRole(['agency', 'system_admin']), updateBrand);
router.post('/:id/products', requireRole(['agency', 'system_admin']), addProduct);
router.put('/products/:id', requireRole(['agency', 'system_admin']), updateProduct);
router.delete('/products/:id', requireRole(['agency', 'system_admin']), deleteProduct);

export default router;
