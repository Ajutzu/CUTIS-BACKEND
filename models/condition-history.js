import mongoose from 'mongoose';
const { Schema } = mongoose;

const ConditionSchema = new Schema({
    name: String,
    description: String,
    severity: {
        type: String,
        enum: ["Low", "Moderate", "High", "Severe", "None"]
    },
    recommendation: String
});

const Condition = mongoose.model('ConditionHistory', ConditionSchema, 'condition_history');
export default Condition;