import mongoose from 'mongoose';

const superAdminAuditLogSchema = new mongoose.Schema(
  {
    actorId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    actorEmail: {
      type: String,
      required: true,
    },
    targetId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    targetEmail: {
      type: String,
      required: true,
    },
    action: {
      type: String,
      required: true,
    },
    reason: {
      type: String,
    },
    ipAddress: {
      type: String,
    },
    userAgent: {
      type: String,
    },
    success: {
      type: Boolean,
      required: true,
    },
  },
  { timestamps: true }
);

superAdminAuditLogSchema.index({ createdAt: 1 }, { expireAfterSeconds: 31536000 }); // Retain for 1 year

export const SuperAdminAuditLog = mongoose.model('SuperAdminAuditLog', superAdminAuditLogSchema);
