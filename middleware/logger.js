import User from '../models/user.js';

// Logging middleware for user activity and requests
export const logUserActivityAndRequest = async ({ userId, action, module, status, req }) => {
    const user = await User.findById(userId);
    if (!user) return;
    user.activity_logs.push({
        action,
        module,
        status,
        timestamp: new Date()
    });
    user.request_logs.push({
        device_name: req.get('User-Agent') || 'Unknown Device',
        ip_address: req.ip || req.connection.remoteAddress || 'Unknown IP',
        status,
        method: req.method, 
        timestamp: new Date()
    });
    await user.save();
};

// Add a medical history entry to the user's record
export const addMedicalHistory = async (userId, condition, imageUrl, recommendation, severity, specialists = [], clinics = []) => {
    try {
        if (!userId) return false;
        
        const user = await User.findById(userId);
        if (!user) return false;
        
        // Create a medical history entry
        user.medical_history.push({
            condition: {
                name: condition.name || condition,
                description: condition.description || `AI-detected skin condition: ${condition.name || condition}`,
                severity: severity || condition.severity || 'Medium',
                recommendation: condition.recommendation || recommendation
            },
            diagnosis_date: new Date(),
            treatment_recommendation: recommendation,
            upload_skin: imageUrl,
            specialists: specialists || [],
            clinics: clinics || []
        });
        
        await user.save();
        return true;
    } catch (error) {
        console.error('Error adding medical history:', error);
        return false;
    }
};
