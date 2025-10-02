import mongoose from 'mongoose';
const { Schema } = mongoose;

const MedicalHistorySchema = new Schema({
    user_id: {
        type: Schema.Types.ObjectId,
        ref: 'User',
        required: true,
        index: true
    },
    condition_id: {
        type: Schema.Types.ObjectId,
        ref: 'ConditionHistory'
    },
    diagnosis_date: Date,
    treatment_recommendation: String,
    upload_skin: String,
    specialists: [{
        type: Schema.Types.ObjectId,
        ref: 'SpecialistHistory'
    }],
    clinics: [{
        type: Schema.Types.ObjectId,
        ref: 'ClinicHistory'
    }],
    clinic_id: {
        type: Schema.Types.ObjectId,
        ref: 'ClinicHistory'
    },
    created_at: {
        type: Date,
        default: Date.now
    }
});

MedicalHistorySchema.index({ user_id: 1, created_at: -1 });

const MedicalHistory = mongoose.model('MedicalHistory', MedicalHistorySchema);
export default MedicalHistory;