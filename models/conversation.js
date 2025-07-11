import mongoose from 'mongoose';

const { Schema, model } = mongoose;

const MessageSchema = new Schema(
  {
    role: { type: String, enum: ['user', 'ai'], required: true },
    content: { type: String, required: true },
    timestamp: { type: Date, default: Date.now },
  },
  { _id: false }
);

const ConversationSchema = new Schema(
  {
    user: { type: Schema.Types.ObjectId, ref: 'user', required: true },
    analysis: { type: Schema.Types.Mixed }, // store analysis report snapshot
    medicalHistory: { type: Schema.Types.ObjectId }, // reference to specific medical_history entry
    messages: [MessageSchema],
  },
  { timestamps: true }
);

const Conversation = model('conversation', ConversationSchema);

export default Conversation;
