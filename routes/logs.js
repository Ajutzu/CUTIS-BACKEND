import express from 'express';
import {
    getAllActivityLogs,
    getUserActivityLogsByName,
    getLogsByModule,
    getRecentActivityLogs,
    toggleActivityLogSeen,
    deleteActivityLog,
    getWarningActivityLogs,
    getAllRequestLogs,
    getUserRequestLogsByName,
    getRequestLogsByMethod,
    getRecentRequestLogs,
} from '../controllers/logs.js';
import { verifyToken, isAdmin } from '../middleware/guard.js';
import { apiLimiter } from '../middleware/limiter.js';

const router = express.Router();

// Apply middleware to all routes
router.use(apiLimiter);
router.use(verifyToken);
router.use(isAdmin);

// Activity Logs Routes
router.get('/', getAllActivityLogs);
router.get('/recent', getRecentActivityLogs);
router.get('/name/:namePattern', getUserActivityLogsByName);
router.get('/module/:module', getLogsByModule);
router.get('/warnings', getWarningActivityLogs);
router.patch('/:id/seen', toggleActivityLogSeen);
router.delete('/:id/delete', deleteActivityLog);

// Request Logs Routes
router.get('/requests', getAllRequestLogs);
router.get('/requests/recent', getRecentRequestLogs);
router.get('/requests/name/:namePattern', getUserRequestLogsByName);
router.get('/requests/method/:method', getRequestLogsByMethod);

export default router;
