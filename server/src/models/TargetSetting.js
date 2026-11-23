import mongoose from 'mongoose';

const targetSchema = new mongoose.Schema({
  employeeId: { type: mongoose.Schema.Types.ObjectId, ref: 'Employee', default: null },
  teamId: { type: mongoose.Schema.Types.ObjectId, ref: 'Team', default: null },
  idDailyTarget: { type: Number, required: true, min: 0 },
  salesDailyTarget: { type: Number, required: true, min: 0 },
  effectiveFrom: { type: Date, required: true },
  effectiveTo: Date,
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
}, { timestamps: true });

targetSchema.index({ employeeId: 1, effectiveFrom: 1 });
targetSchema.index({ teamId: 1, effectiveFrom: 1 });
export default mongoose.model('TargetSetting', targetSchema);
