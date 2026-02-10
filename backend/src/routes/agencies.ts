import express from 'express';
import { listAgencies, getAgency } from '../controllers/agencies.js';
import { authenticate, requireRole } from '../middleware/auth.js';

const router = express.Router();

router.get('/', authenticate, requireRole(['system_admin']), listAgencies);
router.get('/:id', authenticate, requireRole(['agency', 'system_admin']), getAgency);

export default router;
