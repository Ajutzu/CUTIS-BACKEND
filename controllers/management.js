// Importing required modules
import User from '../models/user.js';
import bcrypt from 'bcryptjs';
import { logUserActivityAndRequest } from '../middleware/logger.js';

// Get all users with improved pagination and filtering
export const getAllUsers = async (req, res) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 20;
        const skip = (page - 1) * limit;
        const { role, search, is_active } = req.query;
        
        // Build filter object
        const filter = {};
        if (role) filter.role = role;
        if (is_active !== undefined) {
            if (is_active === 'active') {
                filter.is_active = true;
            } else if (is_active === 'inactive') {
                filter.is_active = false;
            }
        }
        if (search) {
            filter.$or = [
                { name: { $regex: search, $options: 'i' } },
                { email: { $regex: search, $options: 'i' } }
            ];
        }

        // Execute query with pagination using aggregation for better performance
        const users = await User.aggregate([
            { $match: filter },
            { $sort: { created_at: -1 } },
            {
                $project: {
                    _id: 1,
                    name: 1,
                    email: 1,
                    role: 1,
                    is_active: 1,
                    created_at: 1,
                    medical_history_count: { $size: '$medical_history' }
                }
            },
            { $skip: skip },
            { $limit: limit }
        ]);

        // Get total count for pagination using separate count query for better performance
        const total = await User.countDocuments(filter);
        const totalPages = Math.ceil(total / limit);

        res.status(200).json({
            success: true,
            data: users,
            pagination: {
                currentPage: page,
                totalPages,
                totalUsers: total,
                hasNextPage: page < totalPages,
                hasPrevPage: page > 1,
                usersPerPage: limit
            }
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Error fetching users',
            error: error.message
        });
    }
};

// Create new user
export const createUser = async (req, res) => {
    try {
        const { name, email, password, role } = req.body;
        const adminId = req.user?.id; // Assuming admin ID is available in req.user

        // Check if user already exists
        const existingUser = await User.findOne({ email });
        if (existingUser) {
            return res.status(400).json({
                success: false,
                message: 'User with this email already exists'
            });
        }

        // Hash password
        const saltRounds = 12;
        const hashedPassword = await bcrypt.hash(password, saltRounds);

        // Create new user
        const newUser = new User({
            name,
            email,
            password: hashedPassword,
            role: role || 'User'
        });

        const savedUser = await newUser.save();

        // Log admin action using existing logger middleware
        if (adminId) {
            await logUserActivityAndRequest({
                userId: adminId,
                action: 'Creat New Admin',
                module: 'User Management',
                status: 'Success',
                req
            });
        }

        // Remove sensitive data from response
        const userResponse = savedUser.toObject();
        delete userResponse.password;
        delete userResponse.otp;
        delete userResponse.expiration;

        res.status(201).json({
            success: true,
            message: 'User created successfully',
            data: userResponse
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Error creating user',
            error: error.message
        });
    }
};

// Toggle user role (User <-> Admin)
export const toggleUserRole = async (req, res) => {
  try {
    const { id } = req.params;
    const adminId = req.user?.id; // Assuming admin ID is available in req.user

    const user = await User.findById(id);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found"
      });
    }

    const previousRole = user.role;

    // Toggle role between User and Admin
    user.role = previousRole === "Admin" ? "User" : "Admin";
    await user.save();

    // Log admin action using existing logger middleware
    if (adminId) {
      await logUserActivityAndRequest({
        userId: adminId,
        action: "Toggle User Role",
        module: "User Management",
        status: "Success",
        req
      });
    }

    res.status(200).json({
      success: true,
      message: `User role updated successfully: ${previousRole} ➝ ${user.role}`,
      data: {
        id: user._id,
        role: user.role
      }
    });
  } catch (error) {
    console.error("❌ Error toggling user role:", error);
    res.status(500).json({
      success: false,
      message: "Error toggling user role",
      error: error.message
    });
  }
};

// Delete user
export const deleteUser = async (req, res) => {
    try {
        const { id } = req.params;
        const adminId = req.user?.id; // Assuming admin ID is available in req.user

        const user = await User.findById(id);
        if (!user) {
            return res.status(404).json({
                success: false,
                message: 'User not found'
            });
        }

        // Check if trying to delete the last admin
        if (user.role === 'Admin') {
            const adminCount = await User.countDocuments({ role: 'Admin' });
            if (adminCount <= 1) {
                return res.status(400).json({
                    success: false,
                    message: 'Cannot delete the last admin user'
                });
            }
        }

        // Store user info for logging before deletion
        const deletedUserInfo = {
            id: user._id,
            email: user.email,
            role: user.role,
            name: user.name
        };

        await User.findByIdAndDelete(id);

        // Log admin action using existing logger middleware
        if (adminId) {
            await logUserActivityAndRequest({
                userId: adminId,
                action: 'Delete User',
                module: 'User Management',
                status: 'Success',
                req
            });
        }

        res.status(200).json({
            success: true,
            message: 'User deleted successfully'
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Error deleting user',
            error: error.message
        });
    }
};

// Get user statistics
export const getUserStats = async (req, res) => {
    try {
        const totalUsers = await User.countDocuments();
        const activeUsers = await User.countDocuments({ is_active: true });
        const inactiveUsers = await User.countDocuments({ is_active: false });
        const adminUsers = await User.countDocuments({ role: 'Admin' });
        const regularUsers = await User.countDocuments({ role: 'User' });

        // Get users created in last 30 days
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
        const recentUsers = await User.countDocuments({
            created_at: { $gte: thirtyDaysAgo }
        });

        res.status(200).json({
            success: true,
            data: {
                totalUsers,
                activeUsers,
                inactiveUsers,
                adminUsers,
                regularUsers,
                recentUsers
            }
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Error fetching user statistics',
            error: error.message
        });
    }
};
 
// Get users by role with pagination
export const getUsersByRole = async (req, res) => {
    try {
        const { role } = req.params;
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 20;
        const skip = (page - 1) * limit;

        // Validate role
        if (!['Admin', 'User'].includes(role)) {
            return res.status(400).json({
                success: false,
                message: 'Invalid role. Must be either "Admin" or "User"'
            });
        }

        const users = await User.aggregate([
            { $match: { role } },
            { $sort: { created_at: -1 } },
            {
                $project: {
                    _id: 1,
                    name: 1,
                    email: 1,
                    role: 1,
                    is_active: 1,
                    created_at: 1,
                    medical_history_count: { $size: '$medical_history' }
                }
            },
            { $skip: skip },
            { $limit: limit }
        ]);

        const total = await User.countDocuments({ role });
        const totalPages = Math.ceil(total / limit);

        res.status(200).json({
            success: true,
            data: users,
            role,
            pagination: {
                currentPage: page,
                totalPages,
                totalUsers: total,
                hasNextPage: page < totalPages,
                hasPrevPage: page > 1,
                usersPerPage: limit
            }
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Error fetching users by role',
            error: error.message
        });
    }
};

// Search users with advanced filtering
export const searchUsers = async (req, res) => {
    try {
        const { query, role, is_active, dateFrom, dateTo } = req.query;
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 20;
        const skip = (page - 1) * limit;

        // Build advanced filter
        const filter = {};
        
        if (role) filter.role = role;
        if (is_active !== undefined) {
            if (is_active === 'active') {
                filter.is_active = true;
            } else if (is_active === 'inactive') {
                filter.is_active = false;
            }
        }
        
        if (dateFrom || dateTo) {
            filter.created_at = {};
            if (dateFrom) filter.created_at.$gte = new Date(dateFrom);
            if (dateTo) filter.created_at.$lte = new Date(dateTo);
        }

        if (query) {
            filter.$or = [
                { name: { $regex: query, $options: 'i' } },
                { email: { $regex: query, $options: 'i' } }
            ];
        }

        const users = await User.aggregate([
            { $match: filter },
            { $sort: { created_at: -1 } },
            {
                $project: {
                    _id: 1,
                    name: 1,
                    email: 1,
                    role: 1,
                    is_active: 1,
                    created_at: 1,
                    medical_history_count: { $size: '$medical_history' }
                }
            },
            { $skip: skip },
            { $limit: limit }
        ]);

        const total = await User.countDocuments(filter);
        const totalPages = Math.ceil(total / limit);

        res.status(200).json({
            success: true,
            data: users,
            searchQuery: query,
            filters: { role, is_active, dateFrom, dateTo },
            pagination: {
                currentPage: page,
                totalPages,
                totalUsers: total,
                hasNextPage: page < totalPages,
                hasPrevPage: page > 1,
                usersPerPage: limit
            }
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Error searching users',
            error: error.message
        });
    }
};
