import mongoose from 'mongoose';

const snapshotSchema = new mongoose.Schema({ id: mongoose.Schema.Types.ObjectId, name: String }, { _id: false });

const salesSchema = new mongoose.Schema({
  employeeId: { type: mongoose.Schema.Types.ObjectId, ref: 'Employee', required: true },
  transactionDate: { type: Date, required: true },
  amount: { type: Number, required: true, min: 0 },
  currency: { type: String, required: true, uppercase: true, maxlength: 10 },
  saleCount: { type: Number, default: 0, min: 0, validate: Number.isInteger },
  reference: { type: String, default: '', maxlength: 200 },
  notes: { type: String, default: '', maxlength: 1000 },
  enteredBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  teamSnapshot: snapshotSchema,
  supervisorSnapshot: snapshotSchema,
}, { timestamps: true });

salesSchema.index({ employeeId: 1, transactionDate: 1 });
salesSchema.index({ transactionDate: 1 });
export default mongoose.model('SalesRecord', salesSchema);
