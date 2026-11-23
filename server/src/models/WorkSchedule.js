import mongoose from 'mongoose';

const workScheduleSchema = new mongoose.Schema({
  employeeId: { type: mongoose.Schema.Types.ObjectId, ref: 'Employee', required: true },
  weekdaySchedule: {
    type: Map,
    of: { type: Boolean, default: true },
    required: true,
  },
  effectiveFrom: { type: Date, required: true },
  effectiveTo: Date,
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
}, { timestamps: true });

export default mongoose.model('WorkSchedule', workScheduleSchema);
