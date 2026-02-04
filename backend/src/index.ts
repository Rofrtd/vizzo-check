import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import path from 'path';
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

// Middleware
app.use(cors({
  origin: process.env.NODE_ENV === 'production' 
    ? process.env.FRONTEND_URL 
    : 'http://localhost:3000',
  credentials: true
}));
// Increase body size limit to 50MB for file uploads (base64 encoded images can be large)
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Serve uploaded files
const UPLOAD_DIR = process.env.UPLOAD_DIR || './uploads';
app.use('/uploads', express.static(path.join(process.cwd(), UPLOAD_DIR)));

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Database test endpoint
import { testDatabase } from './controllers/test-db.js';
app.get('/api/test-db', testDatabase);

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
