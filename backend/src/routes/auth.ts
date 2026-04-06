import express from 'express';
import rateLimit from 'express-rate-limit';
import { register, login, getMe } from '../controllers/auth.js';
import { authenticate } from '../middleware/auth.js';

const router = express.Router();

// Rate limiting for auth endpoints to prevent brute force attacks
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10, // max 10 attempts per window
  message: { error: 'Too many login attempts, please try again later' },
  standardHeaders: true,
  legacyHeaders: false,
});

const registerLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 5, // max 5 registrations per window
  message: { error: 'Too many registration attempts, please try again later' },
  standardHeaders: true,
  legacyHeaders: false,
});

router.post('/register', registerLimiter, register);
router.post('/login', loginLimiter, login);
router.get('/me', authenticate, getMe);

export default router;
