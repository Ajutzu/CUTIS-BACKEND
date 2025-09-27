// models/ActivityLog.js
import mongoose from 'mongoose';
const { Schema } = mongoose;

const ActivityLogSchema = new Schema({
    user_id: {
        type: Schema.Types.ObjectId,
        ref: 'User',
        required: false,
        default: null,
        index: true
    },
    action: {
        type: String,
        required: true
    },
    module: {
        type: String,
        required: true
    },
    status: {
        type: String,
        required: true
    },
    // Whether this log has been seen by admins (defaults to true for non-warnings)
    seen: {
        type: Boolean,
        default: true,
        index: true
    },
    // Whether this log has been deleted by admins (soft delete)
    deleted: {
        type: Boolean,
        default: false,
        index: true
    },
    timestamp: {
        type: Date,
        default: Date.now
    }
});

// Add compound index for efficient queries
ActivityLogSchema.index({ user_id: 1, timestamp: -1 });
ActivityLogSchema.index({ timestamp: -1 }); // For general time-based queries

const ActivityLog = mongoose.model('ActivityLog', ActivityLogSchema);
export default ActivityLog;
