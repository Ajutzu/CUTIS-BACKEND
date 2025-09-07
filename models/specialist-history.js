import mongoose from 'mongoose';
const { Schema } = mongoose;

const SpecialistSchema = new Schema({
    name: String,
    link: String,
    description: String,
    specialty: String
});

// Use a different collection name to avoid conflict with maps specialists
const Specialist = mongoose.model('SpecialistHistory', SpecialistSchema, 'specialist_history');
export default Specialist;