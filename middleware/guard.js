import jwt from 'jsonwebtoken';
import dotenv from 'dotenv';

dotenv.config();

// Middleware to verify JWT authentication token
export const verifyToken = (req, res, next) => {
    const token = req.cookies.auth || req.cookies.token;
    if (!token) return next({ status: 403, error: 'Missing token' });
    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        req.user = decoded;
        next();
    } catch (err) {
        next({ status: 401, error: 'Invalid token' });
    }
};

// Middleware to verify reset token
export const verifyResetToken = (req, res, next) => {
    const token = req.cookies.resetToken;
    if (!token) return next({ status: 403, error: 'Missing reset token' });
    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        if (!decoded || !decoded.email) {
            return next({ status: 401, error: 'Invalid reset token' });
        }
        req.resetEmail = decoded.email;
        next();
    } catch (err) {
        if (err.name === 'TokenExpiredError') {
            return next({ status: 401, error: 'Reset token has expired' });
        }
        next({ status: 401, error: 'Invalid reset token' });
    }
};

// Optional: Restrict to admin only
export const isAdmin = (req, res, next) => {
    if (req.body.verify !== process.env.ADMIN_SECRET) 
        return next({ status: 403, error: 'Admin only' });
    next();
};

