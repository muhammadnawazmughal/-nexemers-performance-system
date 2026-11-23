import mongoose from 'mongoose';

const importSchema = new mongoose.Schema({
  uploadedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  fileName: { type: String, required: true },
  status: { type: String, enum: ['pending', 'validating', 'completed', 'failed'], default: 'pending' },
  counts: {
    total: { type: Number, default: 0 },
    imported: { type: Number, default: 0 },
    skipped: { type: Number, default: 0 },
    failed: { type: Number, default: 0 },
  },
  validationErrors: { type: [mongoose.Schema.Types.Mixed], default: [] },
  previewRows: { type: [mongoose.Schema.Types.Mixed], default: [], select: false },
  entityType: { type: String, enum: ['daily-records'], default: 'daily-records' },
  completedAt: Date,
}, { timestamps: true });

export default mongoose.model('ImportJob', importSchema);
