import mongoose from "mongoose";

const employeeSchema = new mongoose.Schema(
  {
    employeeCode: { type: String, required: true, unique: true, trim: true },
    fullName: { type: String, required: true, trim: true, maxlength: 100 },
    username: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },
    teamId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Team",
      default: null,
    },
    supervisorId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
    joiningDate: { type: Date, required: true },
    status: { type: String, enum: ["active", "inactive"], default: "active" },
    inactiveFrom: Date,
    timezone: String,
  },
  { timestamps: true },
);

employeeSchema.index({ status: 1, teamId: 1 });
export default mongoose.model("Employee", employeeSchema);
