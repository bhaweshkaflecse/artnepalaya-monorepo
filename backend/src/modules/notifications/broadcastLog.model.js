import mongoose from 'mongoose';

const broadcastLogSchema = new mongoose.Schema({
  title: { type: String, required: true },
  message: { type: String, required: true },
  sentBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
  recipientCount: { type: Number, default: 0 },
  pushesSent: { type: Number, default: 0 },
  createdAt: { type: Date, default: Date.now }
});

export const BroadcastLog = mongoose.model('BroadcastLog', broadcastLogSchema);
