import mongoose from 'mongoose';
const { Schema } = mongoose;

const RequestLogSchema = new Schema({
    user_id: {
        type: Schema.Types.ObjectId,
        ref: 'User',
        required: false,
        default: null,
        index: true
    },
    device_name: {
        type: String,
        required: true
    },
    method: {
        type: String,
        enum: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
        required: true
    },
    ip_address: {
        type: String,
        required: true
    },
    status: {
        type: String,
        required: true
    },
    timestamp: {
        type: Date,
        default: Date.now
    }
});

// Add indexes for performance
RequestLogSchema.index({ user_id: 1, timestamp: -1 });
RequestLogSchema.index({ timestamp: -1 });
RequestLogSchema.index({ ip_address: 1 });

const RequestLog = mongoose.model('RequestLog', RequestLogSchema);
export default RequestLog;