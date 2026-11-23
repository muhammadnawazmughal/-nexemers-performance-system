import mongoose from "mongoose";

const settingSchema = new mongoose.Schema(
  {
    key: { type: String, required: true, unique: true },
    companyName: { type: String, default: "Nexemers International" },
    timezone: { type: String, default: "Asia/Karachi" },
    currency: { type: String, default: "PKR", uppercase: true, maxlength: 10 },
    defaultIdDailyTarget: { type: Number, default: 5, min: 0 },
    defaultSalesDailyTarget: { type: Number, default: 0, min: 0 },
    updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  },
  { timestamps: true },
);

export default mongoose.model("CompanySetting", settingSchema);
