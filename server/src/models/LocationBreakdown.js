import mongoose from 'mongoose';

const locationSchema = new mongoose.Schema({
  dailyRecordId: { type: mongoose.Schema.Types.ObjectId, ref: 'DailyRecord', required: true },
  city: { type: String, required: true, trim: true, maxlength: 100 },
  state: { type: String, required: true, trim: true, maxlength: 100 },
  count: { type: Number, required: true, min: 0, validate: Number.isInteger },
}, { timestamps: true });

export default mongoose.model('LocationBreakdown', locationSchema);
