// Importing required modules
import express from 'express';
import {
    getAllUsers,
    createUser,
    toggleUserStatus,
    deleteUser,
    getUsersByRole,
    searchUsers
} from '../controllers/management.js';
import { verifyToken, isAdmin } from '../middleware/guard.js';
const router = express.Router();

router.get('/users', verifyToken, isAdmin, getAllUsers);    
router.get('/users/search', verifyToken, isAdmin, searchUsers);
router.get('/users/role/:role', verifyToken, isAdmin, getUsersByRole);
router.post('/users', verifyToken, isAdmin, createUser);
router.patch('/users/:id/toggle-status', verifyToken, isAdmin, toggleUserStatus);
router.delete('/users/:id', verifyToken, isAdmin, deleteUser);

export default router;
