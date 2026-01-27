import express from 'express';
import { uploadPhoto, uploadProductPhoto, uploadBrandLogo, uploadStoreLogo, uploadPromoterPhoto } from '../controllers/upload.js';
import { authenticate } from '../middleware/auth.js';
import { upload } from '../utils/fileUpload.js';

const router = express.Router();

router.use(authenticate);

router.post('/photo', upload.single('photo'), uploadPhoto);
router.post('/product-photo', upload.single('photo'), uploadProductPhoto);
router.post('/brand-logo', upload.single('logo'), uploadBrandLogo);
router.post('/store-logo', upload.single('logo'), uploadStoreLogo);
router.post('/promoter-photo', upload.single('photo'), uploadPromoterPhoto);

export default router;
