import express from 'express';
import { getAgency } from '../controllers/agencies.js';
import { authenticate } from '../middleware/auth.js';

const router = express.Router();

router.get('/:id', authenticate, getAgency);

export default router;
