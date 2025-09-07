// models/User.js
import mongoose from 'mongoose';
const { Schema } = mongoose;

// Define the parent User Schema (simplified)
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
        enum: ['Admin', 'User', 'Owner'],
        required: true
    },
    otp: String,
    expiration: Date,
    // Temporary registration data for email verification
    tempRegistration: {
        otp: String,
        expiration: Date,
        isVerified: {
            type: Boolean,
            default: false
        }
    },
    // Temporary email update data for email change verification
    tempEmailUpdate: {
        newEmail: String,
        otp: String,
        expiration: Date
    },
    created_at: {
        type: Date,
        default: Date.now
    },
    is_active: {
        type: Boolean,
        default: false
    }
});

const User = mongoose.model('User', UserSchema);
export default User;