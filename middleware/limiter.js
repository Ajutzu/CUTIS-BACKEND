import rateLimit from 'express-rate-limit';
import { logUserActivityAndRequest } from './logger.js';

const loggedEvents = new Map();

const logRateLimitEvent = async (req, type, moduleName, windowMs) => {
    const userId = req.user?.userId || null;
    const ip = req.ip || req.connection?.remoteAddress || 'unknown';
    const key = `${type}-${moduleName}-${userId || ip}`;
    const now = Date.now();
    
    const lastLogged = loggedEvents.get(key);
    if (lastLogged && (now - lastLogged) < windowMs) {
        return; 
    }
    
    await logUserActivityAndRequest({
        userId,
        action: type,          
        module: moduleName,    
        status: 'Warning',    
        req
    });
    
    loggedEvents.set(key, now);
    
    if (loggedEvents.size > 5) {
        const cutoff = now - (24 * 60 * 60 * 1000); // 24 hours
        for (const [k, v] of loggedEvents.entries()) {
            if (v < cutoff) {
                loggedEvents.delete(k);
            }
        }
    }
};

// Login brute-force limiter
export const loginLimiter = rateLimit({
    windowMs: 5 * 60 * 1000, // 5 minutes
    max: 5,
    handler: async (req, res) => {
        await logRateLimitEvent(req, 'Potential Brute-Force Login', 'Threats', 5 * 60 * 1000);
        res.status(429).json({
            status: 'warning',
            error: 'Too many login attempts',
            message: 'Please try again in 5 minutes.'
        });
    },
    standardHeaders: true,
    legacyHeaders: false,
});

// General API DDoS protection limiter
export const apiLimiter = rateLimit({
    windowMs: 10 * 60 * 1000, // 10 minutes
    max: 250,
    handler: async (req, res) => {
        await logRateLimitEvent(req, 'Potential DDoS Detected', 'Threats', 10 * 60 * 1000);
        res.status(429).json({
            status: 'warning',
            error: 'Too many requests',
            message: 'Please slow down your requests.'
        });
    },
    standardHeaders: true,
    legacyHeaders: false,
});

// Daily skin scan abuse limiter
export const dailySkinLimiter = rateLimit({
    windowMs: 24 * 60 * 60 * 1000, // 24 hours
    max: req => req.user ? 5 : 3,
    keyGenerator: req => req.user?.userId ? `user-${req.user.userId}` : `ip-${req.ip}`,
    handler: async (req, res) => {
        await logRateLimitEvent(req, 'Potential Skin Scan Abuse', 'Threats', 24 * 60 * 60 * 1000);
        res.status(429).json({
            status: 'warning',
            error: 'Daily limit reached',
            message: req.user
                ? "You have used all 5 skin scans today."
                : "Guests can only use 3 skin scans per day."
        });
    },
    standardHeaders: true,
    legacyHeaders: false,
});
