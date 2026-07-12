const mongoose = require("mongoose");

const appSettingsSchema = new mongoose.Schema(
  {
    key: { type: String, required: true, unique: true, default: "main" },
    premiumPrice: { type: Number, required: true, min: 0.5, max: 999.99 },
    freePdfLimit: { type: Number, required: true, min: 1, max: 100, default: 5 },
  },
  { timestamps: true }
);

module.exports = mongoose.model("AppSettings", appSettingsSchema);
