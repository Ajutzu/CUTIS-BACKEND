import express from 'express';
import { 
  loginUser, 
  registerUser, 
  googleLogin, 
  forgotPassword, 
  OTPChecker, 
  updatePassword,
  verifyRegistrationOTP,
} from '../controllers/auth.js';
import { loginLimiter, apiLimiter } from '../middleware/limiter.js';
import { verifyResetToken } from '../middleware/guard.js';

const router = express.Router();

// Apply rate limiting to all routes
router.use(apiLimiter);

// Public routes
router.post('/login', loginLimiter, loginUser);
router.post('/register', registerUser);
router.post('/verify-registration-otp', verifyRegistrationOTP);
router.post('/google-oauth', loginLimiter, googleLogin);
router.post('/forgot-password', forgotPassword);

// Token verification routes
router.post('/verify-otp', verifyResetToken, OTPChecker);
router.post('/update-password', verifyResetToken, updatePassword);

export default router;
