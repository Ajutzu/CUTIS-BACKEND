// models/ActivityLog.js
import mongoose from 'mongoose';
const { Schema } = mongoose;

const ActivityLogSchema = new Schema({
    user_id: {
        type: Schema.Types.ObjectId,
        ref: 'User',
        required: false,
        index: true
    },
    action: String,
    module: String,
    status: String,
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
