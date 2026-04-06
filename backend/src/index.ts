import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import authRoutes from './routes/auth.js';
import agencyRoutes from './routes/agencies.js';
import promoterRoutes from './routes/promoters.js';
import brandRoutes from './routes/brands.js';
import storeRoutes from './routes/stores.js';
import visitRoutes from './routes/visits.js';
import reportRoutes from './routes/reports.js';
import uploadRoutes from './routes/upload.js';
import allocationRoutes from './routes/allocations.js';
import { errorHandler } from './middleware/errorHandler.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;

// Validate CORS origin in production
if (process.env.NODE_ENV === 'production' && !process.env.FRONTEND_URL) {
  console.warn('WARNING: FRONTEND_URL is not set in production. CORS will reject all cross-origin requests.');
}

// Middleware
app.use(cors({
  origin: process.env.NODE_ENV === 'production'
    ? process.env.FRONTEND_URL || false
    : 'http://localhost:3000',
  credentials: true
}));
// Increase body size limit to 50MB for file uploads (base64 encoded images can be large)
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// NOTE: Static /uploads route removed for security — uploaded files are served
// via Supabase Storage with proper access controls. If local file serving is
// needed, it must be placed behind the authenticate middleware.

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Database test endpoint (restricted to system_admin)
import { testDatabase } from './controllers/test-db.js';
import { authenticate, requireRole } from './middleware/auth.js';
app.get('/api/test-db', authenticate, requireRole(['system_admin']), testDatabase);

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/agencies', agencyRoutes);
app.use('/api/promoters', promoterRoutes);
app.use('/api/brands', brandRoutes);
app.use('/api/stores', storeRoutes);
app.use('/api/visits', visitRoutes);
app.use('/api/reports', reportRoutes);
app.use('/api/upload', uploadRoutes);
app.use('/api/allocations', allocationRoutes);

// Error handling middleware
app.use(errorHandler);

// 404 handler
app.use((req, res) => {
  res.status(404).json({ error: 'Route not found' });
});

app.listen(PORT, () => {
  console.log(`🚀 Backend server running on port ${PORT}`);
});
