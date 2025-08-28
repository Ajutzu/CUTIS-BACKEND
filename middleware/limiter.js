import rateLimit from 'express-rate-limit';

// Limiting the number of requests to the login route
export const loginLimiter = rateLimit({
    windowMs: 5 * 60 * 1000,
    max: 10,
    handler: (req, res, next) => {
        next({
            status: 429,
            error: 'Too many login attempts',
            message: 'Please try again in 5 minutes.'
        });
    },
    standardHeaders: true,
    legacyHeaders: false,
});

// Limiting the number of requests to general API routes
export const apiLimiter = rateLimit({
    windowMs: 10 * 60 * 1000,
    max: 500,
    handler: (req, res, next) => {
        next({
            status: 429,
            error: 'Too many requests',
            message: 'Please try again in 10 minutes.'
        });
    },
    standardHeaders: true,
    legacyHeaders: false,
});



