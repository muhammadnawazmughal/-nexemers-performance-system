import mongoose from 'mongoose';

const attendanceSchema = new mongoose.Schema({
  employeeId: { type: mongoose.Schema.Types.ObjectId, ref: 'Employee', required: true },
  workDate: { type: Date, required: true },
  attendanceStatus: { type: String, enum: ['present', 'absent', 'leave', 'off'], required: true },
  notes: { type: String, default: '', maxlength: 1000 },
  markedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
}, { timestamps: true });

attendanceSchema.index({ employeeId: 1, workDate: 1 }, { unique: true });
export default mongoose.model('Attendance', attendanceSchema);
