import mongoose from 'mongoose';

const userSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true, maxlength: 100 },
  email: { type: String, required: true, unique: true, lowercase: true, trim: true },
  username: { type: String, required: true, unique: true, lowercase: true, trim: true },
  passwordHash: { type: String, required: true, select: false },
  role: { type: String, enum: ['super_admin', 'supervisor', 'employee'], required: true },
  employeeId: { type: mongoose.Schema.Types.ObjectId, ref: 'Employee', default: null },
  isActive: { type: Boolean, default: true },
  lastLoginAt: Date,
  refreshTokenHash: { type: String, select: false },
  passwordResetHash: { type: String, select: false },
  passwordResetExpires: { type: Date, select: false },
}, { timestamps: true });

export default mongoose.model('User', userSchema);
