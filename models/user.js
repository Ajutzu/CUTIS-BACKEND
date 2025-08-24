// Impoting required modules
import mongoose from 'mongoose';

const { Schema } = mongoose;

// Define the child Condition Schema
const ConditionSchema = new Schema({
    name: String,
    description: String,
    severity: {
        type: String,
        enum: ["Low", "Moderate", "High", "Severe"]
    },
    recommendation: String
});

// Define the Specialist Schema
const SpecialistSchema = new Schema({
    name: String,
    link: String,
    description: String,
    specialty: String
});

// Define the Clinic Schema
const ClinicSchema = new Schema({
    title: String,
    link: String,
    snippet: String,
    condition: String
});

// Define the child Medical History Schema
const MedicalHistorySchema = new Schema({
    condition: ConditionSchema,
    diagnosis_date: Date,
    treatment_recommendation: String,
    upload_skin: String,
    specialists: [SpecialistSchema],
    clinics: [ClinicSchema],
    clinic_id: {
        type: Schema.Types.ObjectId,
        ref: 'Clinic'
    }
});

// Define the child Activity Log Schema
const ActivityLogSchema = new Schema({
    action: String,
    module: String,
    status: String,
    timestamp: {
        type: Date,
        default: Date.now
    }
});

// Define the child Request Log Schema
const RequestLogSchema = new Schema({
    device_name: String,
    method: {
        type: String,
        enum: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH']
    },
    ip_address: String,
    status: String,
    timestamp: {
        type: Date,
        default: Date.now
    }
});

// Define the parent User Schema
const UserSchema = new Schema({
    name: String,
    email: {
        type: String,
        required: true,
        unique: true,
        trim: true
    },
    password: {
        type: String,
        required: true
    },
    role: {
        type: String,
        enum: ['Admin', 'User'],
        required: true
    },
    otp: String,
    expiration: Date,
    created_at: {
        type: Date,
        default: Date.now
    },
    is_active: {
        type: Boolean,
        default: true
    },
    medical_history: [MedicalHistorySchema],
    activity_logs: [ActivityLogSchema],
    request_logs: [RequestLogSchema]
});

const User = mongoose.model('User', UserSchema);
export default User;