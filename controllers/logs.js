// Logs controller for fetching activity logs
import User from '../models/user.js';
import ActivityLog from '../models/activity-log.js';
import RequestLog from '../models/request-log.js';

// Get all activity logs with pagination
export const getAllActivityLogs = async (req, res, next) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 20;
        const skip = (page - 1) * limit;

        const total = await ActivityLog.countDocuments({ deleted: { $ne: true } });

        const logs = await ActivityLog.aggregate([
            { $sort: { timestamp: -1 } },
            { $skip: skip },
            { $limit: limit },
            {
                $lookup: {
                    from: 'users',
                    localField: 'user_id',
                    foreignField: '_id',
                    as: 'userInfo'
                }
            },
            { $unwind: { path: '$userInfo', preserveNullAndEmptyArrays: true } },
            {
                $project: {
                    _id: '$_id',
                    action: '$action',
                    module: '$module',
                    status: '$status',
                    seen: '$seen',
                    timestamp: '$timestamp',
                    userId: { $ifNull: ['$userInfo._id', null] },
                    userName: { $ifNull: ['$userInfo.name', 'Guest'] },
                    userEmail: { $ifNull: ['$userInfo.email', 'example.gmail.com'] },
                    userRole: { $ifNull: ['$userInfo.role', 'Guest'] }
                }
            }
        ]);
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

        const userIds = matchingUsers.map(u => u._id);

        const total = await ActivityLog.countDocuments({ user_id: { $in: userIds }, deleted: { $ne: true } });

        const logs = await ActivityLog.aggregate([
            { $match: { user_id: { $in: userIds }, deleted: { $ne: true } } },
            { $sort: { timestamp: -1 } },
            { $skip: skip },
            { $limit: limit },
            {
                $lookup: {
                    from: 'users',
                    localField: 'user_id',
                    foreignField: '_id',
                    as: 'userInfo'
                }
            },
            { $unwind: { path: '$userInfo', preserveNullAndEmptyArrays: true } },
            {
                $project: {
                    _id: '$_id',
                    action: '$action',
                    module: '$module',
                    status: '$status',
                    seen: '$seen',
                    timestamp: '$timestamp',
                    userId: { $ifNull: ['$userInfo._id', null] },
                    userName: { $ifNull: ['$userInfo.name', 'Guest'] },
                    userEmail: { $ifNull: ['$userInfo.email', 'example.gmail.com'] },
                    userRole: { $ifNull: ['$userInfo.role', 'Guest'] }
                }
            }
        ]);
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

        const filter = { module, deleted: { $ne: true } };
        const total = await ActivityLog.countDocuments(filter);

        const logs = await ActivityLog.aggregate([
            { $match: filter },
            { $sort: { timestamp: -1 } },
            { $skip: skip },
            { $limit: limit },
            {
                $lookup: {
                    from: 'users',
                    localField: 'user_id',
                    foreignField: '_id',
                    as: 'userInfo'
                }
            },
            { $unwind: { path: '$userInfo', preserveNullAndEmptyArrays: true } },
            {
                $project: {
                    _id: '$_id',
                    action: '$action',
                    module: '$module',
                    status: '$status',
                    seen: '$seen',
                    timestamp: '$timestamp',
                    userId: { $ifNull: ['$userInfo._id', null] },
                    userName: { $ifNull: ['$userInfo.name', 'Guest'] },
                    userEmail: { $ifNull: ['$userInfo.email', null] },
                    userRole: { $ifNull: ['$userInfo.role', 'guest'] }
                }
            }
        ]);
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

        const logs = await ActivityLog.aggregate([
            { $match: { timestamp: { $gte: twentyFourHoursAgo }, deleted: { $ne: true } } },
            { $sort: { timestamp: -1 } },
            { $limit: limit },
            {
                $lookup: {
                    from: 'users',
                    localField: 'user_id',
                    foreignField: '_id',
                    as: 'userInfo'
                }
            },
            { $unwind: { path: '$userInfo', preserveNullAndEmptyArrays: true } },
            {
                $project: {
                    _id: '$_id',
                    action: '$action',
                    module: '$module',
                    status: '$status',
                    seen: '$seen',
                    timestamp: '$timestamp',
                    userId: { $ifNull: ['$userInfo._id', null] },
                    userName: { $ifNull: ['$userInfo.name', 'Guest'] },
                    userEmail: { $ifNull: ['$userInfo.email', null] },
                    userRole: { $ifNull: ['$userInfo.role', 'guest'] }
                }
            }
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

// Toggle or set seen flag for an activity log
export const toggleActivityLogSeen = async (req, res, next) => {
    try {
        const { id } = req.params;
        const { seen } = req.body || {};

        const doc = await ActivityLog.findById(id);
        if (!doc) {
            return res.status(404).json({ success: false, message: 'Activity log not found' });
        }

        const newSeen = typeof seen === 'boolean' ? seen : !Boolean(doc.seen);
        doc.seen = newSeen;
        await doc.save();

        return res.status(200).json({ success: true, data: { id: doc._id, seen: doc.seen } });
    } catch (error) {
        console.error('Error toggling activity log seen:', error);
        return res.status(500).json({ success: false, message: 'Failed to toggle activity log seen', error: error.message });
    }
};

// Mark an activity log as deleted (soft delete)
export const deleteActivityLog = async (req, res, next) => {
    try {
        const { id } = req.params;

        const doc = await ActivityLog.findById(id);
        if (!doc) {
            return res.status(404).json({ success: false, message: 'Activity log not found' });
        }

        doc.deleted = true;
        await doc.save();

        return res.status(200).json({ success: true, data: { id: doc._id, deleted: doc.deleted } });
    } catch (error) {
        console.error('Error deleting activity log:', error);
        return res.status(500).json({ success: false, message: 'Failed to delete activity log', error: error.message });
    }
};

// Fetch only warning activity logs (optionally only unseen)
export const getWarningActivityLogs = async (req, res, next) => {
    try {
        const onlyUnseen = String(req.query.onlyUnseen || 'false').toLowerCase() === 'true';
        const limit = parseInt(req.query.limit) || 100;

        const match = { status: 'Warning', deleted: { $ne: true } };

        const logs = await ActivityLog.aggregate([
            { $match: match },
            { $sort: { timestamp: -1 } },
            { $limit: limit },
            {
                $lookup: {
                    from: 'users',
                    localField: 'user_id',
                    foreignField: '_id',
                    as: 'userInfo'
                }
            },
            { $unwind: { path: '$userInfo', preserveNullAndEmptyArrays: true } },
            {
                $project: {
                    _id: '$_id',
                    action: '$action',
                    module: '$module',
                    status: '$status',
                    seen: '$seen',
                    timestamp: '$timestamp',
                    userId: { $ifNull: ['$userInfo._id', null] },
                    userName: { $ifNull: ['$userInfo.name', 'Guest'] },
                    userEmail: { $ifNull: ['$userInfo.email', 'example.gmail.com'] },
                    userRole: { $ifNull: ['$userInfo.role', 'Guest'] }
                }
            }
        ]);

        return res.status(200).json({ success: true, data: logs });
    } catch (error) {
        console.error('Error fetching warning activity logs:', error);
        return res.status(500).json({ success: false, message: 'Failed to fetch warning activity logs', error: error.message });
    }
};

// Get all request logs with pagination
export const getAllRequestLogs = async (req, res, next) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 20;
        const skip = (page - 1) * limit;

        const total = await RequestLog.countDocuments();

        const logs = await RequestLog.aggregate([
            { $sort: { timestamp: -1 } },
            { $skip: skip },
            { $limit: limit },
            {
                $lookup: {
                    from: 'users',
                    localField: 'user_id',
                    foreignField: '_id',
                    as: 'userInfo'
                }
            },
            { $unwind: { path: '$userInfo', preserveNullAndEmptyArrays: true } },
            {
                $project: {
                    _id: '$_id',
                    device_name: '$device_name',
                    method: '$method',
                    ip_address: '$ip_address',
                    status: '$status',
                    timestamp: '$timestamp',
                    userId: { $ifNull: ['$userInfo._id', null] },
                    userName: { $ifNull: ['$userInfo.name', 'Guest'] },
                    userEmail: { $ifNull: ['$userInfo.email', 'example.gmail.com'] },
                    userRole: { $ifNull: ['$userInfo.role', 'Guest'] }
                }
            }
        ]);
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

        const userIds = matchingUsers.map(u => u._id);

        const total = await RequestLog.countDocuments({ user_id: { $in: userIds } });

        const logs = await RequestLog.aggregate([
            { $match: { user_id: { $in: userIds } } },
            { $sort: { timestamp: -1 } },
            { $skip: skip },
            { $limit: limit },
            {
                $lookup: {
                    from: 'users',
                    localField: 'user_id',
                    foreignField: '_id',
                    as: 'userInfo'
                }
            },
            { $unwind: { path: '$userInfo', preserveNullAndEmptyArrays: true } },
            {
                $project: {
                    _id: '$_id',
                    device_name: '$device_name',
                    method: '$method',
                    ip_address: '$ip_address',
                    status: '$status',
                    timestamp: '$timestamp',
                    userId: { $ifNull: ['$userInfo._id', null] },
                    userName: { $ifNull: ['$userInfo.name', 'Guest'] },
                    userEmail: { $ifNull: ['$userInfo.email', 'example.gmail.com'] },
                    userRole: { $ifNull: ['$userInfo.role', 'Guest'] }
                }
            }
        ]);
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

        const filter = { method: method.toUpperCase() };
        const total = await RequestLog.countDocuments(filter);

        const logs = await RequestLog.aggregate([
            { $match: filter },
            { $sort: { timestamp: -1 } },
            { $skip: skip },
            { $limit: limit },
            {
                $lookup: {
                    from: 'users',
                    localField: 'user_id',
                    foreignField: '_id',
                    as: 'userInfo'
                }
            },
            { $unwind: { path: '$userInfo', preserveNullAndEmptyArrays: true } },
            {
                $project: {
                    _id: '$_id',
                    device_name: '$device_name',
                    method: '$method',
                    ip_address: '$ip_address',
                    status: '$status',
                    timestamp: '$timestamp',
                    userId: { $ifNull: ['$userInfo._id', null] },
                    userName: { $ifNull: ['$userInfo.name', 'Guest'] },
                    userEmail: { $ifNull: ['$userInfo.email', 'example.gmail.com'] },
                    userRole: { $ifNull: ['$userInfo.role', 'Guest'] }
                }
            }
        ]);
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

        const logs = await RequestLog.aggregate([
            { $match: { timestamp: { $gte: twentyFourHoursAgo } } },
            { $sort: { timestamp: -1 } },
            { $limit: limit },
            {
                $lookup: {
                    from: 'users',
                    localField: 'user_id',
                    foreignField: '_id',
                    as: 'userInfo'
                }
            },
            { $unwind: { path: '$userInfo', preserveNullAndEmptyArrays: true } },
            {
                $project: {
                    _id: '$_id',
                    device_name: '$device_name',
                    method: '$method',
                    ip_address: '$ip_address',
                    status: '$status',
                    timestamp: '$timestamp',
                    userId: { $ifNull: ['$userInfo._id', null] },
                    userName: { $ifNull: ['$userInfo.name', 'Guest'] },
                    userEmail: { $ifNull: ['$userInfo.email', 'example.gmail.com'] },
                    userRole: { $ifNull: ['$userInfo.role', 'Guest'] }
                }
            }
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
