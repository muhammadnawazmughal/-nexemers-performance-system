import mongoose from 'mongoose';

const auditSchema = new mongoose.Schema({
  actorId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  action: { type: String, required: true },
  entityType: { type: String, required: true },
  entityId: mongoose.Schema.Types.ObjectId,
  before: mongoose.Schema.Types.Mixed,
  after: mongoose.Schema.Types.Mixed,
  reason: String,
  ip: String,
  userAgent: String,
  timestamp: { type: Date, default: Date.now, immutable: true },
}, { timestamps: false });

auditSchema.index({ entityType: 1, entityId: 1, timestamp: -1 });
auditSchema.index({ actorId: 1, timestamp: -1 });
export default mongoose.model('AuditLog', auditSchema);
