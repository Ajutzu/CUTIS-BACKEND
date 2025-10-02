import User from '../models/user.js';
import ActivityLog from '../models/activity-log.js';
import RequestLog from '../models/request-log.js';
import MedicalHistory from '../models/medical-history.js';
import Condition from '../models/condition-history.js';
import Specialist from '../models/specialist-history.js';
import Clinic from '../models/clinic-history.js';

// Function to emit warning notifications via WebSocket
const emitWarningNotification = (logData) => {
    if (global.io && logData.status === 'Warning') {
        const notification = {
            id: logData._id,
            type: 'warning',
            title: 'Warning Alert',
            message: `${logData.action} in ${logData.module} module`,
            timestamp: new Date().toISOString(),
            user: {
                name: logData.userName || 'Unknown User',
                email: logData.userEmail || 'unknown@example.com',
                role: logData.userRole || 'Guest'
            },
            module: logData.module,
            action: logData.action
        };
        
        global.io.to('admin-notifications').emit('warning-notification', notification);
    }
};

// Logging middleware for user activity and requests
export const logUserActivityAndRequest = async ({ userId, action, module, status, req }) => {
    const now = new Date();
    const device = (req && (req.get?.('User-Agent') || req.headers?.['user-agent'])) || 'Unknown Device';
    const ip = (req && (req.ip || req.connection?.remoteAddress || req.headers?.['x-forwarded-for'])) || 'Unknown IP';
    const method = (req && req.method) || 'GET';

    // Resolve user if provided; allow guest (null user)
    let resolvedUserId = null;
    let userInfo = null;
    if (userId) {
        try {
            const user = await User.findById(userId);
            if (user) {
                resolvedUserId = user._id;
                userInfo = {
                    name: user.name,
                    email: user.email,
                    role: user.role
                };
            }
        } catch (e) {
            resolvedUserId = null;
        }
    }

    // Create activity log (mark warnings as unseen, others as seen)
    const activityLog = await ActivityLog.create({
        user_id: resolvedUserId,
        action,
        module,
        status,
        seen: status === 'Warning' ? false : true,
        timestamp: now
    });

    // Create request log
    await RequestLog.create({
        user_id: resolvedUserId,
        device_name: device,
        ip_address: Array.isArray(ip) ? ip[0] : ip,
        status,
        method,
        timestamp: now
    });

    // Emit notification for warning logs
    if (status === 'Warning') {
        const logData = {
            _id: activityLog._id,
            action,
            module,
            status,
            timestamp: now.toISOString(),
            userName: userInfo?.name || 'Guest',
            userEmail: userInfo?.email || 'unknown@example.com',
            userRole: userInfo?.role || 'Guest'
        };
        emitWarningNotification(logData);
    }
};

// Add a medical history entry to the user's record
export const addMedicalHistory = async (userId, condition, imageUrl, recommendation, severity, specialists = [], clinics = []) => {
    try {
        if (!userId) return false;

        const user = await User.findById(userId);
        if (!user) return false;

        // Normalize condition payload
        const conditionPayload = typeof condition === 'string'
            ? { name: condition }
            : (condition || {});
        if (severity && !conditionPayload.severity) conditionPayload.severity = severity;
        if (recommendation && !conditionPayload.recommendation) conditionPayload.recommendation = recommendation;
        if (!conditionPayload.description && conditionPayload.name) {
            conditionPayload.description = `AI-detected skin condition: ${conditionPayload.name}`;
        }

        // Create Condition document
        const conditionDoc = await Condition.create({
            name: conditionPayload.name || 'Unknown',
            description: conditionPayload.description,
            severity: conditionPayload.severity,
            recommendation: conditionPayload.recommendation
        });

        // Create Specialist documents (if provided as objects/strings), or map to IDs if already ObjectIds
        const specialistIds = await Promise.all((specialists || []).map(async (s) => {
            if (!s) return null;
            // If already an ObjectId-like value, accept as-is
            if (typeof s === 'string') {
                // Heuristic: strings that look like ObjectId (24 hex chars)
                if (/^[a-f\d]{24}$/i.test(s)) return s;
                const doc = await Specialist.create({ name: s });
                return doc._id;
            }
            if (s._id) return s._id;
            const doc = await Specialist.create({
                name: s.name,
                link: s.link,
                description: s.description,
                specialty: s.specialty
            });
            return doc._id;
        })).then(arr => arr.filter(Boolean));

        // Create Clinic documents - UPDATED TO HANDLE NEW SCHEMA
        const clinicIds = await Promise.all((clinics || []).map(async (c) => {
            if (!c) return null;
            
            // If already an ObjectId-like value, accept as-is
            if (typeof c === 'string') {
                if (/^[a-f\d]{24}$/i.test(c)) return c;
                // For string values, create with minimal required fields
                const doc = await Clinic.create({ 
                    title: c,
                    link: '',
                    snippet: '',
                    condition: conditionPayload.name || 'Unknown'
                });
                return doc._id;
            }
            
            if (c._id) return c._id;
            
            // Handle new clinic object structure from scraping
            // Map new fields to old schema structure to maintain compatibility
            const clinicData = {
                title: c.name || c.title || 'Unknown Clinic',
                link: c.website || c.link || '',
                snippet: c.snippet || c.address || '',
                condition: conditionPayload.name || 'Unknown'
            };
            
            const doc = await Clinic.create(clinicData);
            return doc._id;
        })).then(arr => arr.filter(Boolean));

        // Create MedicalHistory document referencing the created docs
        const medicalHistoryDoc = await MedicalHistory.create({
            user_id: user._id,
            condition_id: conditionDoc._id,
            diagnosis_date: new Date(),
            treatment_recommendation: recommendation,
            upload_skin: imageUrl,
            specialists: specialistIds,
            clinics: clinicIds
        });

        return { success: true, historyId: medicalHistoryDoc._id };
    } catch (error) {
        console.error('Error adding medical history:', error);
        return false;
    }
};