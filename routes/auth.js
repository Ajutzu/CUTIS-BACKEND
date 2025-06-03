import express from 'express';
import { 
  loginUser, 
  registerUser, 
  googleLogin, 
  forgotPassword, 
  OTPChecker, 
  updatePassword,
} from '../controllers/auth.js';
import { loginLimiter, apiLimiter } from '../middleware/limiter.js';
import { verifyResetToken } from '../middleware/guard.js';

const router = express.Router();

// Public routes
router.post('/login', loginUser);
router.post('/register', apiLimiter, registerUser);
router.post('/google-oauth', loginLimiter, googleLogin);
router.post('/forgot-password', apiLimiter, forgotPassword);

// Token verification routes
router.post('/verify-otp', apiLimiter, verifyResetToken, OTPChecker);
router.post('/update-password', apiLimiter, verifyResetToken, updatePassword);

export default router;
