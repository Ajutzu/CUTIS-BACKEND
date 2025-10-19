// Importing required modules
import express from 'express';
import {
    getAllUsers,
    createUser,
    toggleUserRole,
    archiveUser,
    banUser,
    unbanUser,
    getUsersByRole,
    searchUsers,
    unarchiveUser
} from '../controllers/management.js';
import { verifyToken, isAdmin } from '../middleware/guard.js';
import { apiLimiter } from '../middleware/limiter.js';

const router = express.Router();

// Apply middleware to all routes
router.use(apiLimiter);
router.use(verifyToken);
router.use(isAdmin);

router.get('/users', getAllUsers);    
router.get('/users/search', searchUsers);
router.get('/users/role/:role', getUsersByRole);
router.post('/users', createUser);
router.patch('/users/:id/toggle-role', toggleUserRole);
router.patch('/users/:id/archive', archiveUser);
router.patch('/users/:id/unarchive', unarchiveUser);
router.patch('/users/:id/ban', banUser);
router.patch('/users/:id/unban', unbanUser);

export default router;
