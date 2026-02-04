import { Response } from 'express';
import { supabase } from '../lib/supabase.js';
import { AppError } from '../middleware/errorHandler.js';
import { AuthRequest } from '../middleware/auth.js';
import { calculateFinancialReport } from '../services/financial.js';
import { FinancialReportQuery } from '@vizzocheck/shared';
import {
  getPromoterReport,
  getBrandReport,
  getStoreReport,
  getToBePaidReport,
  getToBeReceivedReport
} from '../services/financialReports.js';
import { calculatePlannedVisits } from '../services/plannedVisits.js';
import { getBrandsWithoutAllocations } from '../services/brandsWithoutAllocations.js';

export async function getFinancialReport(req: AuthRequest, res: Response) {
  const agencyId = req.agencyId!;
  const query = req.query as unknown as FinancialReportQuery;

  try {
    const report = await calculateFinancialReport(agencyId, query);
    res.json(report);
  } catch (error: any) {
    throw new AppError(error.message || 'Failed to generate financial report', 500);
  }
}

export async function exportFinancialReport(req: AuthRequest, res: Response) {
  const agencyId = req.agencyId!;
  const query = req.query as unknown as FinancialReportQuery;
  const format = req.query.format as string || 'csv';

  try {
    const report = await calculateFinancialReport(agencyId, query);

    if (format === 'csv') {
      // Generate CSV
      let csv = 'Group,Visits,Promoter Payments,Brand Charges,Gross Margin\n';
      
      if (report.grouped_data) {
        report.grouped_data.forEach((item: any) => {
          csv += `${item.group_key},${item.visits},${item.promoter_payments},${item.brand_charges},${item.gross_margin}\n`;
        });
      }
      
      csv += `Total,${report.total_visits},${report.total_promoter_payments},${report.total_brand_charges},${report.gross_margin}\n`;

      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', 'attachment; filename=financial-report.csv');
      res.send(csv);
    } else if (format === 'pdf') {
      // For PDF, we'd use a library like pdfkit
      // For MVP, return JSON with a note that PDF export needs implementation
      throw new AppError('PDF export not yet implemented', 501);
    } else {
      throw new AppError('Invalid format. Use csv or pdf', 400);
    }
  } catch (error: any) {
    if (error instanceof AppError) {
      throw error;
    }
    throw new AppError(error.message || 'Failed to export financial report', 500);
  }
}

// New report endpoints
export async function getPromoterReportController(req: AuthRequest, res: Response) {
  const agencyId = req.agencyId!;
  const startDate = req.query.startDate as string | undefined;
  const endDate = req.query.endDate as string | undefined;

  try {
    const report = await getPromoterReport(agencyId, startDate, endDate);
    res.json(report);
  } catch (error: any) {
    throw new AppError(error.message || 'Failed to generate promoter report', 500);
  }
}

export async function getBrandReportController(req: AuthRequest, res: Response) {
  const agencyId = req.agencyId!;
  const startDate = req.query.startDate as string | undefined;
  const endDate = req.query.endDate as string | undefined;

  try {
    const report = await getBrandReport(agencyId, startDate, endDate);
    res.json(report);
  } catch (error: any) {
    throw new AppError(error.message || 'Failed to generate brand report', 500);
  }
}

export async function getStoreReportController(req: AuthRequest, res: Response) {
  const agencyId = req.agencyId!;
  const startDate = req.query.startDate as string | undefined;
  const endDate = req.query.endDate as string | undefined;

  try {
    const report = await getStoreReport(agencyId, startDate, endDate);
    res.json(report);
  } catch (error: any) {
    throw new AppError(error.message || 'Failed to generate store report', 500);
  }
}

export async function getToBePaidReportController(req: AuthRequest, res: Response) {
  const agencyId = req.agencyId!;
  const startDate = req.query.startDate as string | undefined;
  const endDate = req.query.endDate as string | undefined;

  try {
    const report = await getToBePaidReport(agencyId, startDate, endDate);
    res.json(report);
  } catch (error: any) {
    throw new AppError(error.message || 'Failed to generate to be paid report', 500);
  }
}

export async function getToBeReceivedReportController(req: AuthRequest, res: Response) {
  const agencyId = req.agencyId!;
  const startDate = req.query.startDate as string | undefined;
  const endDate = req.query.endDate as string | undefined;

  try {
    const report = await getToBeReceivedReport(agencyId, startDate, endDate);
    res.json(report);
  } catch (error: any) {
    throw new AppError(error.message || 'Failed to generate to be received report', 500);
  }
}

export async function getPlannedVisitsController(req: AuthRequest, res: Response) {
  const agencyId = req.agencyId!;
  
  // Default: first day of current month to today
  const now = new Date();
  const firstDayOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  
  const startDate = req.query.startDate as string || firstDayOfMonth.toISOString().split('T')[0];
  const endDate = req.query.endDate as string || now.toISOString().split('T')[0];

  try {
    const report = await calculatePlannedVisits(agencyId, startDate, endDate);
    res.json(report);
  } catch (error: any) {
    throw new AppError(error.message || 'Failed to calculate planned visits', 500);
  }
}

export async function getBrandsWithoutAllocationsController(req: AuthRequest, res: Response) {
  const agencyId = req.agencyId!;

  try {
    const brands = await getBrandsWithoutAllocations(agencyId);
    res.json(brands);
  } catch (error: any) {
    throw new AppError(error.message || 'Failed to get brands without allocations', 500);
  }
}
