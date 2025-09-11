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
    max: 300,
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

// Limiting the number of skin scans per day
export const dailySkinLimiter = rateLimit({
  windowMs: 24 * 60 * 60 * 1000, // 24 hours
  max: (req, res) => req.user ? 5 : 3, // 5/day for logged-in, 3/day for guests
  keyGenerator: (req, res) => {
    if (req.user && req.user.userId) return `user-${req.user.userId}`; // logged-in
    return `ip-${req.ip}`; // guest
  },
  handler: (req, res, next) => {
    res.status(429).json({
      error: "Daily limit reached",
      message: req.user
        ? "You have used all 5 skin scans today."
        : "Guests can only use 3 skin scans per day. Please log in for more."
    });
  },
  standardHeaders: true,
  legacyHeaders: false,
});