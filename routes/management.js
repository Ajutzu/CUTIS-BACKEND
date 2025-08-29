// Importing required modules
import express from 'express';
import {
    getAllUsers,
    createUser,
    toggleUserRole,
    deleteUser,
    getUsersByRole,
    searchUsers
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
router.delete('/users/:id', deleteUser);

export default router;
