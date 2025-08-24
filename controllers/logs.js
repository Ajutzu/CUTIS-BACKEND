// Logs controller for fetching activity logs
import User from '../models/user.js';

// Get all activity logs with pagination
export const getAllActivityLogs = async (req, res, next) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 20;
        const skip = (page - 1) * limit;

        // Aggregate to get all activity logs from all users with pagination
        const logs = await User.aggregate([
            // Unwind the activity_logs array
            { $unwind: '$activity_logs' },
            
            // Sort by timestamp (newest first)
            { $sort: { 'activity_logs.timestamp': -1 } },
            
            // Add user information to each log
            {
                $lookup: {
                    from: 'users',
                    localField: '_id',
                    foreignField: '_id',
                    as: 'userInfo'
                }
            },
            
            // Unwind userInfo array
            { $unwind: '$userInfo' },
            
            // Project the fields we want
            {
                $project: {
                    _id: '$activity_logs._id',
                    action: '$activity_logs.action',
                    module: '$activity_logs.module',
                    status: '$activity_logs.status',
                    timestamp: '$activity_logs.timestamp',
                    userId: '$userInfo._id',
                    userName: '$userInfo.name',
                    userEmail: '$userInfo.email',
                    userRole: '$userInfo.role'
                }
            },
            
            // Skip and limit for pagination
            { $skip: skip },
            { $limit: limit }
        ]);

        // Get total count for pagination
        const totalLogs = await User.aggregate([
            { $unwind: '$activity_logs' },
            { $count: 'total' }
        ]);

        const total = totalLogs.length > 0 ? totalLogs[0].total : 0;
        const totalPages = Math.ceil(total / limit);

        res.status(200).json({
            success: true,
            data: logs,
            pagination: {
                currentPage: page,
                totalPages,
                totalLogs: total,
                hasNextPage: page < totalPages,
                hasPrevPage: page > 1
            }
        });

    } catch (error) {
        console.error('Error fetching activity logs:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch activity logs',
            error: error.message
        });
    }
};

// Get activity logs for users by name pattern
export const getUserActivityLogsByName = async (req, res, next) => {
    try {
        const { namePattern } = req.params;
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 20;
        const skip = (page - 1) * limit;

        // Create case-insensitive regex pattern for name search
        const nameRegex = new RegExp(namePattern, 'i');

        // Find users matching the name pattern
        const matchingUsers = await User.find({ name: nameRegex });
        
        if (matchingUsers.length === 0) {
            return res.status(404).json({
                success: false,
                message: `No users found with name containing '${namePattern}'`
            });
        }

        // Get activity logs for all matching users with pagination
        const logs = await User.aggregate([
            // Match users with the name pattern
            { $match: { name: nameRegex } },
            
            // Unwind the activity_logs array
            { $unwind: '$activity_logs' },
            
            // Sort by timestamp (newest first)
            { $sort: { 'activity_logs.timestamp': -1 } },
            
            // Project the fields we want
            {
                $project: {
                    _id: '$activity_logs._id',
                    action: '$activity_logs.action',
                    module: '$activity_logs.module',
                    status: '$activity_logs.status',
                    timestamp: '$activity_logs.timestamp',
                    userId: '$_id',
                    userName: '$name',
                    userEmail: '$email',
                    userRole: '$role'
                }
            },
            
            // Skip and limit for pagination
            { $skip: skip },
            { $limit: limit }
        ]);

        // Get total count for pagination
        const totalLogs = await User.aggregate([
            { $match: { name: nameRegex } },
            { $unwind: '$activity_logs' },
            { $count: 'total' }
        ]);

        const total = totalLogs.length > 0 ? totalLogs[0].total : 0;
        const totalPages = Math.ceil(total / limit);

        res.status(200).json({
            success: true,
            data: logs,
            searchPattern: namePattern,
            matchingUsers: matchingUsers.map(user => ({
                id: user._id,
                name: user.name,
                email: user.email,
                role: user.role
            })),
            pagination: {
                currentPage: page,
                totalPages,
                totalLogs: total,
                hasNextPage: page < totalPages,
                hasPrevPage: page > 1
            }
        });

    } catch (error) {
        console.error('Error fetching user activity logs by name:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch user activity logs by name',
            error: error.message
        });
    }
};

// Get activity logs by module
export const getLogsByModule = async (req, res, next) => {
    try {
        const { module } = req.params;
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 20;
        const skip = (page - 1) * limit;

        const logs = await User.aggregate([
            { $unwind: '$activity_logs' },
            { $match: { 'activity_logs.module': module } },
            { $sort: { 'activity_logs.timestamp': -1 } },
            {
                $lookup: {
                    from: 'users',
                    localField: '_id',
                    foreignField: '_id',
                    as: 'userInfo'
                }
            },
            { $unwind: '$userInfo' },
            {
                $project: {
                    _id: '$activity_logs._id',
                    action: '$activity_logs.action',
                    module: '$activity_logs.module',
                    status: '$activity_logs.status',
                    timestamp: '$activity_logs.timestamp',
                    userId: '$userInfo._id',
                    userName: '$userInfo.name',
                    userEmail: '$userInfo.email',
                    userRole: '$userInfo.role'
                }
            },
            { $skip: skip },
            { $limit: limit }
        ]);

        // Get total count for this module
        const totalLogs = await User.aggregate([
            { $unwind: '$activity_logs' },
            { $match: { 'activity_logs.module': module } },
            { $count: 'total' }
        ]);

        const total = totalLogs.length > 0 ? totalLogs[0].total : 0;
        const totalPages = Math.ceil(total / limit);

        res.status(200).json({
            success: true,
            data: logs,
            module,
            pagination: {
                currentPage: page,
                totalPages,
                totalLogs: total,
                hasNextPage: page < totalPages,
                hasPrevPage: page > 1
            }
        });

    } catch (error) {
        console.error('Error fetching logs by module:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch logs by module',
            error: error.message
        });
    }
};

// Get recent activity logs (last 24 hours)
export const getRecentActivityLogs = async (req, res, next) => {
    try {
        const limit = parseInt(req.query.limit) || 50;
        const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);

        const logs = await User.aggregate([
            { $unwind: '$activity_logs' },
            { $match: { 'activity_logs.timestamp': { $gte: twentyFourHoursAgo } } },
            { $sort: { 'activity_logs.timestamp': -1 } },
            {
                $lookup: {
                    from: 'users',
                    localField: '_id',
                    foreignField: '_id',
                    as: 'userInfo'
                }
            },
            { $unwind: '$userInfo' },
            {
                $project: {
                    _id: '$activity_logs._id',
                    action: '$activity_logs.action',
                    module: '$activity_logs.module',
                    status: '$activity_logs.status',
                    timestamp: '$activity_logs.timestamp',
                    userId: '$userInfo._id',
                    userName: '$userInfo.name',
                    userEmail: '$userInfo.email',
                    userRole: '$userInfo.role'
                }
            },
            { $limit: limit }
        ]);

        res.status(200).json({
            success: true,
            data: logs,
            timeRange: 'Last 24 hours',
            totalLogs: logs.length
        });

    } catch (error) {
        console.error('Error fetching recent activity logs:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch recent activity logs',
            error: error.message
        });
    }
};

// Get all request logs with pagination
export const getAllRequestLogs = async (req, res, next) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 20;
        const skip = (page - 1) * limit;

        // Aggregate to get all request logs from all users with pagination
        const logs = await User.aggregate([
            // Unwind the request_logs array
            { $unwind: '$request_logs' },
            
            // Sort by timestamp (newest first)
            { $sort: { 'request_logs.timestamp': -1 } },
            
            // Add user information to each log
            {
                $lookup: {
                    from: 'users',
                    localField: '_id',
                    foreignField: '_id',
                    as: 'userInfo'
                }
            },
            
            // Unwind userInfo array
            { $unwind: '$userInfo' },
            
            // Project the fields we want
            {
                $project: {
                    _id: '$request_logs._id',
                    device_name: '$request_logs.device_name',
                    method: '$request_logs.method',
                    ip_address: '$request_logs.ip_address',
                    status: '$request_logs.status',
                    timestamp: '$request_logs.timestamp',
                    userId: '$userInfo._id',
                    userName: '$userInfo.name',
                    userEmail: '$userInfo.email',
                    userRole: '$userInfo.role'
                }
            },
            
            // Skip and limit for pagination
            { $skip: skip },
            { $limit: limit }
        ]);

        // Get total count for pagination
        const totalLogs = await User.aggregate([
            { $unwind: '$request_logs' },
            { $count: 'total' }
        ]);

        const total = totalLogs.length > 0 ? totalLogs[0].total : 0;
        const totalPages = Math.ceil(total / limit);

        res.status(200).json({
            success: true,
            data: logs,
            pagination: {
                currentPage: page,
                totalPages,
                totalLogs: total,
                hasNextPage: page < totalPages,
                hasPrevPage: page > 1
            }
        });

    } catch (error) {
        console.error('Error fetching request logs:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch request logs',
            error: error.message
        });
    }
};

// Get request logs for users by name pattern
export const getUserRequestLogsByName = async (req, res, next) => {
    try {
        const { namePattern } = req.params;
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 20;
        const skip = (page - 1) * limit;

        // Create case-insensitive regex pattern for name search
        const nameRegex = new RegExp(namePattern, 'i');

        // Find users matching the name pattern
        const matchingUsers = await User.find({ name: nameRegex });
        
        if (matchingUsers.length === 0) {
            return res.status(404).json({
                success: false,
                message: `No users found with name containing '${namePattern}'`
            });
        }

        // Get request logs for all matching users with pagination
        const logs = await User.aggregate([
            // Match users with the name pattern
            { $match: { name: nameRegex } },
            
            // Unwind the request_logs array
            { $unwind: '$request_logs' },
            
            // Sort by timestamp (newest first)
            { $sort: { 'request_logs.timestamp': -1 } },
            
            // Project the fields we want
            {
                $project: {
                    _id: '$request_logs._id',
                    device_name: '$request_logs.device_name',
                    method: '$request_logs.method',
                    ip_address: '$request_logs.ip_address',
                    status: '$request_logs.status',
                    timestamp: '$request_logs.timestamp',
                    userId: '$_id',
                    userName: '$name',
                    userEmail: '$email',
                    userRole: '$role'
                }
            },
            
            // Skip and limit for pagination
            { $skip: skip },
            { $limit: limit }
        ]);

        // Get total count for pagination
        const totalLogs = await User.aggregate([
            { $match: { name: nameRegex } },
            { $unwind: '$request_logs' },
            { $count: 'total' }
        ]);

        const total = totalLogs.length > 0 ? totalLogs[0].total : 0;
        const totalPages = Math.ceil(total / limit);

        res.status(200).json({
            success: true,
            data: logs,
            searchPattern: namePattern,
            matchingUsers: matchingUsers.map(user => ({
                id: user._id,
                name: user.name,
                email: user.email,
                role: user.role
            })),
            pagination: {
                currentPage: page,
                totalPages,
                totalLogs: total,
                hasNextPage: page < totalPages,
                hasPrevPage: page > 1
            }
        });

    } catch (error) {
        console.error('Error fetching user request logs by name:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch user request logs by name',
            error: error.message
        });
    }
};

// Get request logs by method (GET, POST, PUT, DELETE)
export const getRequestLogsByMethod = async (req, res, next) => {
    try {
        const { method } = req.params;
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 20;
        const skip = (page - 1) * limit;

        const logs = await User.aggregate([
            { $unwind: '$request_logs' },
            { $match: { 'request_logs.method': method.toUpperCase() } },
            { $sort: { 'request_logs.timestamp': -1 } },
            {
                $lookup: {
                    from: 'users',
                    localField: '_id',
                    foreignField: '_id',
                    as: 'userInfo'
                }
            },
            { $unwind: '$userInfo' },
            {
                $project: {
                    _id: '$request_logs._id',
                    device_name: '$request_logs.device_name',
                    method: '$request_logs.method',
                    ip_address: '$request_logs.ip_address',
                    status: '$request_logs.status',
                    timestamp: '$request_logs.timestamp',
                    userId: '$userInfo._id',
                    userName: '$userInfo.name',
                    userEmail: '$userInfo.email',
                    userRole: '$userInfo.role'
                }
            },
            { $skip: skip },
            { $limit: limit }
        ]);

        // Get total count for this method
        const totalLogs = await User.aggregate([
            { $unwind: '$request_logs' },
            { $match: { 'request_logs.method': method.toUpperCase() } },
            { $count: 'total' }
        ]);

        const total = totalLogs.length > 0 ? totalLogs[0].total : 0;
        const totalPages = Math.ceil(total / limit);

        res.status(200).json({
            success: true,
            data: logs,
            method: method.toUpperCase(),
            pagination: {
                currentPage: page,
                totalPages,
                totalLogs: total,
                hasNextPage: page < totalPages,
                hasPrevPage: page > 1
            }
        });

    } catch (error) {
        console.error('Error fetching request logs by method:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch request logs by method',
            error: error.message
        });
    }
};

// Get recent request logs (last 24 hours)
export const getRecentRequestLogs = async (req, res, next) => {
    try {
        const limit = parseInt(req.query.limit) || 50;
        const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);

        const logs = await User.aggregate([
            { $unwind: '$request_logs' },
            { $match: { 'request_logs.timestamp': { $gte: twentyFourHoursAgo } } },
            { $sort: { 'request_logs.timestamp': -1 } },
            {
                $lookup: {
                    from: 'users',
                    localField: '_id',
                    foreignField: '_id',
                    as: 'userInfo'
                }
            },
            { $unwind: '$userInfo' },
            {
                $project: {
                    _id: '$request_logs._id',
                    device_name: '$request_logs.device_name',
                    method: '$request_logs.method',
                    ip_address: '$request_logs.ip_address',
                    status: '$request_logs.status',
                    timestamp: '$request_logs.timestamp',
                    userId: '$userInfo._id',
                    userName: '$userInfo.name',
                    userEmail: '$userInfo.email',
                    userRole: '$userInfo.role'
                }
            },
            { $limit: limit }
        ]);

        res.status(200).json({
            success: true,
            data: logs,
            timeRange: 'Last 24 hours',
            totalLogs: logs.length
        });

    } catch (error) {
        console.error('Error fetching recent request logs:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch recent request logs',
            error: error.message
        });
    }
};