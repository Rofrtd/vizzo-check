import express from 'express';
import {
  getFinancialReport,
  exportFinancialReport,
  getPromoterReportController,
  getBrandReportController,
  getStoreReportController,
  getToBePaidReportController,
  getToBeReceivedReportController,
  getPlannedVisitsController,
  getBrandsWithoutAllocationsController
} from '../controllers/reports.js';
import { authenticate, requireRole } from '../middleware/auth.js';

const router = express.Router();

router.use(authenticate);
router.use(requireRole(['agency', 'system_admin']));

router.get('/financial', getFinancialReport);
router.get('/financial/export', exportFinancialReport);
router.get('/promoters', getPromoterReportController);
router.get('/brands', getBrandReportController);
router.get('/stores', getStoreReportController);
router.get('/to-be-paid', getToBePaidReportController);
router.get('/to-be-received', getToBeReceivedReportController);
router.get('/planned-visits', getPlannedVisitsController);
router.get('/brands-without-allocations', getBrandsWithoutAllocationsController);

export default router;
