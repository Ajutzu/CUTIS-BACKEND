// Impoting required modules
import mongoose from 'mongoose';

const { Schema } = mongoose;

// Define the Condition Schema
const ConditionSchema = new Schema({
  name: {
    type: String,
    required: true
  },
  description: String,
  severity: {
    type: String,
    enum: ["Low", "Moderate", "High", "Severe"],
    required: true
  },
  recommendation: String,
  created_at: {
    type: Date,
    default: Date.now
  },
  updated_at: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' }
});

const Condition = mongoose.model('Condition', ConditionSchema);
export default Condition;