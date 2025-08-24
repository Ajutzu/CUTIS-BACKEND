import express from 'express';
import {
    getAllActivityLogs,
    getUserActivityLogsByName,
    getLogsByModule,
    getRecentActivityLogs,
    getAllRequestLogs,
    getUserRequestLogsByName,
    getRequestLogsByMethod,
    getRecentRequestLogs
} from '../controllers/logs.js';
import { verifyToken, isAdmin } from '../middleware/guard.js';

const router = express.Router();

// Activity Logs Routes
router.get('/', verifyToken, isAdmin, getAllActivityLogs);
router.get('/recent', verifyToken, isAdmin, getRecentActivityLogs);
router.get('/name/:namePattern', verifyToken, isAdmin, getUserActivityLogsByName);
router.get('/module/:module', verifyToken, isAdmin, getLogsByModule);

// Request Logs Routes
router.get('/requests', verifyToken, isAdmin, getAllRequestLogs);
router.get('/requests/recent', verifyToken, isAdmin, getRecentRequestLogs);
router.get('/requests/name/:namePattern', verifyToken, isAdmin, getUserRequestLogsByName);
router.get('/requests/method/:method', verifyToken, isAdmin, getRequestLogsByMethod);

export default router;
