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
        const { role, search, is_active, includeArchived } = req.query;
        
        // Build filter object
        const filter = {};
        // Exclude archived by default; include when explicitly requested
        if (includeArchived !== 'true') {
            filter.is_archived = { $ne: true };
        }
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
            { $skip: skip },
            { $limit: limit },
            {
                $lookup: {
                    from: 'medicalhistories',
                    localField: '_id',
                    foreignField: 'user_id',
                    as: 'medical_history'
                }
            },
            {
                $project: {
                    _id: 1,
                    name: 1,
                    email: 1,
                    role: 1,
                    is_active: 1,
                    is_banned: 1,
                    is_archived: 1,
                    banned_at: 1,
                    archived_at: 1,
                    created_at: 1,
                    medical_history_count: { $size: '$medical_history' }
                }
            }
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

// Archive user (replaces delete)
export const archiveUser = async (req, res) => {
    try {
        const { id } = req.params;
        const adminId = req.user?.id;

        const user = await User.findById(id);
        if (!user) {
            return res.status(404).json({
                success: false,
                message: 'User not found'
            });
        }

        if (user.is_archived) {
            return res.status(400).json({
                success: false,
                message: 'User is already archived'
            });
        }

        // Check if trying to archive the last admin
        if (user.role === 'Admin') {
            const activeAdminCount = await User.countDocuments({ 
                role: 'Admin', 
                is_archived: false,
                _id: { $ne: id }
            });
            if (activeAdminCount < 1) {
                return res.status(400).json({
                    success: false,
                    message: 'Cannot archive the last admin user'
                });
            }
        }

        // Archive the user
        user.is_archived = true;
        user.archived_at = new Date();
        user.is_active = false;
        await user.save();

        // Log admin action
        if (adminId) {
            await logUserActivityAndRequest({
                userId: adminId,
                action: 'Archive User',
                module: 'User Management',
                status: 'Success',
                req
            });
        }

        res.status(200).json({
            success: true,
            message: 'User archived successfully'
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Error archiving user',
            error: error.message
        });
    }
};

// Ban user
export const banUser = async (req, res) => {
    try {
        const { id } = req.params;
        const adminId = req.user?.id;

        const user = await User.findById(id);
        if (!user) {
            return res.status(404).json({
                success: false,
                message: 'User not found'
            });
        }

        if (user.is_banned) {
            return res.status(400).json({
                success: false,
                message: 'User is already banned'
            });
        }

        if (user.is_archived) {
            return res.status(400).json({
                success: false,
                message: 'Cannot ban an archived user'
            });
        }

        // Check if trying to ban the last admin
        if (user.role === 'Admin') {
            const activeAdminCount = await User.countDocuments({ 
                role: 'Admin', 
                is_banned: false,
                is_archived: false,
                _id: { $ne: id }
            });
            if (activeAdminCount < 1) {
                return res.status(400).json({
                    success: false,
                    message: 'Cannot ban the last admin user'
                });
            }
        }

        // Ban the user
        user.is_banned = true;
        user.banned_at = new Date();
        user.is_active = false;
        await user.save();

        // Log admin action
        if (adminId) {
            await logUserActivityAndRequest({
                userId: adminId,
                action: 'Ban User',
                module: 'User Management',
                status: 'Success',
                req
            });
        }

        res.status(200).json({
            success: true,
            message: 'User banned successfully'
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Error banning user',
            error: error.message
        });
    }
};

// Unban user
export const unbanUser = async (req, res) => {
    try {
        const { id } = req.params;
        const adminId = req.user?.id;

        const user = await User.findById(id);
        if (!user) {
            return res.status(404).json({
                success: false,
                message: 'User not found'
            });
        }

        if (!user.is_banned) {
            return res.status(400).json({
                success: false,
                message: 'User is not banned'
            });
        }

        // Unban the user
        user.is_banned = false;
        user.banned_at = null;
        await user.save();

        // Log admin action
        if (adminId) {
            await logUserActivityAndRequest({
                userId: adminId,
                action: 'Unban User',
                module: 'User Management',
                status: 'Success',
                req
            });
        }

        res.status(200).json({
            success: true,
            message: 'User unbanned successfully'
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Error unbanning user',
            error: error.message
        });
    }
};

// Get user statistics
export const getUserStats = async (req, res) => {
    try {
        const totalUsers = await User.countDocuments({ is_archived: false });
        const activeUsers = await User.countDocuments({ is_active: true, is_archived: false });
        const inactiveUsers = await User.countDocuments({ is_active: false, is_archived: false });
        const adminUsers = await User.countDocuments({ role: 'Admin', is_archived: false });
        const regularUsers = await User.countDocuments({ role: 'User', is_archived: false });
        const bannedUsers = await User.countDocuments({ is_banned: true, is_archived: false });
        const archivedUsers = await User.countDocuments({ is_archived: true });

        // Get users created in last 30 days (excluding archived)
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
        const recentUsers = await User.countDocuments({
            created_at: { $gte: thirtyDaysAgo },
            is_archived: false
        });

        res.status(200).json({
            success: true,
            data: {
                totalUsers,
                activeUsers,
                inactiveUsers,
                adminUsers,
                regularUsers,
                bannedUsers,
                archivedUsers,
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
        const { includeArchived } = req.query;

        // Validate role
        if (!['Admin', 'User'].includes(role)) {
            return res.status(400).json({
                success: false,
                message: 'Invalid role. Must be either "Admin" or "User"'
            });
        }

        const roleFilter = includeArchived === 'true' ? { role } : { role, is_archived: { $ne: true } };

        const users = await User.aggregate([
            { $match: roleFilter },
            { $sort: { created_at: -1 } },
            { $skip: skip },
            { $limit: limit },
            {
                $lookup: {
                    from: 'medicalhistories',
                    localField: '_id',
                    foreignField: 'user_id',
                    as: 'medical_history'
                }
            },
            {
                $project: {
                    _id: 1,
                    name: 1,
                    email: 1,
                    role: 1,
                    is_active: 1,
                    is_banned: 1,
                    is_archived: 1,
                    banned_at: 1,
                    archived_at: 1,
                    created_at: 1,
                    medical_history_count: { $size: '$medical_history' }
                }
            }
        ]);

        const total = await User.countDocuments(roleFilter);
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
        const { query, role, is_active, dateFrom, dateTo, includeArchived } = req.query;
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 20;
        const skip = (page - 1) * limit;

        // Build advanced filter
        const filter = {};
        if (includeArchived !== 'true') {
            filter.is_archived = { $ne: true };
        }
        
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
            { $skip: skip },
            { $limit: limit },
            {
                $lookup: {
                    from: 'medicalhistories',
                    localField: '_id',
                    foreignField: 'user_id',
                    as: 'medical_history'
                }
            },
            {
                $project: {
                    _id: 1,
                    name: 1,
                    email: 1,
                    role: 1,
                    is_active: 1,
                    is_banned: 1,
                    is_archived: 1,
                    banned_at: 1,
                    archived_at: 1,
                    created_at: 1,
                    medical_history_count: { $size: '$medical_history' }
                }
            }
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

// Unarchive user
export const unarchiveUser = async (req, res) => {
    try {
        const { id } = req.params;
        const adminId = req.user?.id;

        const user = await User.findById(id);
        if (!user) {
            return res.status(404).json({
                success: false,
                message: 'User not found'
            });
        }

        if (!user.is_archived) {
            return res.status(400).json({
                success: false,
                message: 'User is not archived'
            });
        }

        user.is_archived = false;
        user.archived_at = null;
        user.is_active = true; // restore to active status per requirement
        await user.save();

        if (adminId) {
            await logUserActivityAndRequest({
                userId: adminId,
                action: 'Unarchive User',
                module: 'User Management',
                status: 'Success',
                req
            });
        }

        res.status(200).json({
            success: true,
            message: 'User unarchived successfully'
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Error unarchiving user',
            error: error.message
        });
    }
};
