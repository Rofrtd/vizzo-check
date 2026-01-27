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
import { authenticate } from '../middleware/auth.js';

const router = express.Router();

router.use(authenticate);

router.get('/', listBrands);
router.post('/', createBrand);
router.get('/authorized/:storeId', getAuthorizedBrandsForStore);
router.get('/:id', getBrand);
router.put('/:id', updateBrand);
router.post('/:id/products', addProduct);
router.put('/products/:id', updateProduct);
router.delete('/products/:id', deleteProduct);

export default router;
