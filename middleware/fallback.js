// Error Handling Middleware
export default function errorHandler(err, req, res, next) {
    const status = err.status || 500;
    const message = err.message || err.error || 'Internal server error.';
    res.status(status).json({ message });
}