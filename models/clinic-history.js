import mongoose from 'mongoose';
const { Schema } = mongoose;

const ClinicSchema = new Schema({
    title: String,
    link: String,
    snippet: String,
    condition: String
});

// Use a different collection name to avoid conflict with maps clinics
const Clinic = mongoose.model('ClinicHistory', ClinicSchema, 'clinic_history');
export default Clinic;