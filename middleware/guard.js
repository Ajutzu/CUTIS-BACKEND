import jwt from 'jsonwebtoken';
import dotenv from 'dotenv';

dotenv.config();

// Middleware to verify JWT authentication token
export const verifyToken = (req, res, next) => {
    let token = null;

    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer ')) {
        token = req.headers.authorization.split(' ')[1];
    } else {
        token = req.cookies?.token;
    }

    if (!token) {
        return next({ status: 403, error: 'Missing token' });
    }

    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        req.user = decoded;
        next();
    } catch (err) {
        next({ status: 401, error: 'Invalid token' });
    }
};

// Optional: Restrict to admin only
export const isAdmin = (req, res, next) => {
    if (req.query.verify !== process.env.ADMIN_SECRET) {
        return next({ status: 403, error: 'Admin only' });
    }
    next();
};
