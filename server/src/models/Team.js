import mongoose from 'mongoose';

const teamSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true, maxlength: 100 },
  code: { type: String, required: true, unique: true, uppercase: true, trim: true },
  description: { type: String, default: '', maxlength: 500 },
  supervisorId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
  isActive: { type: Boolean, default: true },
}, { timestamps: true });

export default mongoose.model('Team', teamSchema);
