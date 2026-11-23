import mongoose from "mongoose";

const snapshotSchema = new mongoose.Schema(
  {
    id: mongoose.Schema.Types.ObjectId,
    name: String,
  },
  { _id: false },
);

const dailyRecordSchema = new mongoose.Schema(
  {
    employeeId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Employee",
      required: true,
    },
    workDate: { type: Date, required: true },
    totalIds: { type: Number, required: true, min: 0, validate: Number.isInteger },
    status: { type: String, enum: ["submitted"], default: "submitted" },
    notes: { type: String, default: "", maxlength: 1000 },
    enteredBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    teamSnapshot: snapshotSchema,
    supervisorSnapshot: snapshotSchema,
  },
  { timestamps: true },
);

dailyRecordSchema.index({ employeeId: 1, workDate: 1 }, { unique: true });
dailyRecordSchema.index({
  workDate: 1,
  "teamSnapshot.id": 1,
  "supervisorSnapshot.id": 1,
});
export default mongoose.model("DailyRecord", dailyRecordSchema);
