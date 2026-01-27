import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { AppError } from '../middleware/errorHandler.js';

const UPLOAD_DIR = process.env.UPLOAD_DIR || './uploads';
const MAX_FILE_SIZE = parseInt(process.env.MAX_FILE_SIZE || '10485760'); // 10MB default

// Ensure upload directory exists
export function ensureUploadDir(agencyId: string, visitId: string): string {
  const dir = path.join(UPLOAD_DIR, agencyId, 'visits', visitId);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  return dir;
}

// Configure multer storage
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    // We'll set the destination dynamically in the route handler
    cb(null, UPLOAD_DIR);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const ext = path.extname(file.originalname);
    cb(null, `photo-${uniqueSuffix}${ext}`);
  }
});

// File filter - only images
const fileFilter = (req: any, file: Express.Multer.File, cb: multer.FileFilterCallback) => {
  const allowedMimes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
  
  if (allowedMimes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new AppError('Only image files are allowed', 400));
  }
};

export const upload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: MAX_FILE_SIZE
  }
});

/**
 * Save uploaded file to agency-specific directory
 */
export function saveVisitPhoto(
  file: Express.Multer.File,
  agencyId: string,
  visitId: string,
  productId: string,
  type: 'before' | 'after'
): string {
  const dir = ensureUploadDir(agencyId, visitId);
  const ext = path.extname(file.originalname);
  const filename = `product-${productId}-${type}-${Date.now()}${ext}`;
  const filepath = path.join(dir, filename);

  // Move file from temp location to final location
  fs.renameSync(file.path, filepath);

  // Return relative URL path
  return `/uploads/${agencyId}/visits/${visitId}/${filename}`;
}

/**
 * Ensure product upload directory exists
 */
export function ensureProductUploadDir(agencyId: string, productId: string): string {
  const dir = path.join(UPLOAD_DIR, agencyId, 'products', productId);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  return dir;
}

/**
 * Save product photo
 */
export function saveProductPhoto(
  file: Express.Multer.File,
  agencyId: string,
  productId: string
): string {
  const dir = ensureProductUploadDir(agencyId, productId);
  const ext = path.extname(file.originalname);
  const filename = `product-${Date.now()}${ext}`;
  const filepath = path.join(dir, filename);

  // Move file from temp location to final location
  fs.renameSync(file.path, filepath);

  // Return relative URL path
  return `/uploads/${agencyId}/products/${productId}/${filename}`;
}

/**
 * Ensure brand logo upload directory exists
 */
export function ensureBrandLogoUploadDir(agencyId: string, brandId: string): string {
  const dir = path.join(UPLOAD_DIR, agencyId, 'brands', brandId);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  return dir;
}

/**
 * Save brand logo
 */
export function saveBrandLogo(
  file: Express.Multer.File,
  agencyId: string,
  brandId: string
): string {
  const dir = ensureBrandLogoUploadDir(agencyId, brandId);
  const ext = path.extname(file.originalname);
  const filename = `logo-${Date.now()}${ext}`;
  const filepath = path.join(dir, filename);

  // Move file from temp location to final location
  fs.renameSync(file.path, filepath);

  // Return relative URL path
  return `/uploads/${agencyId}/brands/${brandId}/${filename}`;
}

/**
 * Ensure store logo upload directory exists
 */
export function ensureStoreLogoUploadDir(agencyId: string, storeId: string): string {
  const dir = path.join(UPLOAD_DIR, agencyId, 'stores', storeId);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  return dir;
}

/**
 * Save store logo
 */
export function saveStoreLogo(
  file: Express.Multer.File,
  agencyId: string,
  storeId: string
): string {
  const dir = ensureStoreLogoUploadDir(agencyId, storeId);
  const ext = path.extname(file.originalname);
  const filename = `logo-${Date.now()}${ext}`;
  const filepath = path.join(dir, filename);

  // Move file from temp location to final location
  fs.renameSync(file.path, filepath);

  // Return relative URL path
  return `/uploads/${agencyId}/stores/${storeId}/${filename}`;
}

/**
 * Ensure promoter photo upload directory exists
 */
export function ensurePromoterPhotoUploadDir(agencyId: string, promoterId: string): string {
  const dir = path.join(UPLOAD_DIR, agencyId, 'promoters', promoterId);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  return dir;
}

/**
 * Save promoter photo
 */
export function savePromoterPhoto(
  file: Express.Multer.File,
  agencyId: string,
  promoterId: string
): string {
  const dir = ensurePromoterPhotoUploadDir(agencyId, promoterId);
  const ext = path.extname(file.originalname);
  const filename = `photo-${Date.now()}${ext}`;
  const filepath = path.join(dir, filename);

  // Move file from temp location to final location
  fs.renameSync(file.path, filepath);

  // Return relative URL path
  return `/uploads/${agencyId}/promoters/${promoterId}/${filename}`;
}

/**
 * Get full file path from URL
 */
export function getFilePathFromUrl(url: string): string {
  // Remove leading slash and join with upload dir
  const relativePath = url.startsWith('/') ? url.substring(1) : url;
  return path.join(process.cwd(), relativePath);
}
