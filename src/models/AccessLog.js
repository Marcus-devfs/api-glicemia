const mongoose = require("mongoose");
const { Schema } = mongoose;

const accessLogSchema = new Schema({
  userId: {
    type: Schema.Types.ObjectId,
    ref: "User",
    required: true,
    index: true,
  },
  action: {
    type: String,
    enum: ["login", "session_restore", "pdf_download", "register"],
    required: true,
  },
  ip: { type: String, default: null },
  userAgent: { type: String, default: null },
  metadata: { type: Schema.Types.Mixed, default: null },
  createdAt: { type: Date, default: Date.now, index: true },
});

const AccessLog = mongoose.model("AccessLog", accessLogSchema);

module.exports = AccessLog;
