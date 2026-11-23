import mongoose from 'mongoose';

const assignmentSchema = new mongoose.Schema({
  employeeId: { type: mongoose.Schema.Types.ObjectId, ref: 'Employee', required: true },
  teamId: { type: mongoose.Schema.Types.ObjectId, ref: 'Team', required: true },
  supervisorId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  effectiveFrom: { type: Date, required: true },
  effectiveTo: Date,
}, { timestamps: true });

assignmentSchema.index({ employeeId: 1, effectiveFrom: 1, effectiveTo: 1 });
export default mongoose.model('TeamAssignment', assignmentSchema);
