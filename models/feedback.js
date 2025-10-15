import mongoose from 'mongoose';

const { Schema, model } = mongoose;

const FeedbackSchema = new Schema(
  {
    user: { type: Schema.Types.ObjectId, ref: 'user', default: null, index: true },
    module: { type: String, enum: ['skin_detection', 'ai_conversation'], required: true },
    rating: { type: Number, min: 1, max: 5, required: true },
    comment: { type: String, trim: true, maxlength: 2000, default: '' },
    metadata: { type: Schema.Types.Mixed },
  },
  { timestamps: true }
);

FeedbackSchema.index(
  { user: 1, module: 1 },
  { unique: true, partialFilterExpression: { user: { $exists: true, $ne: null } } }
);

const Feedback = model('feedback', FeedbackSchema);

export default Feedback;
