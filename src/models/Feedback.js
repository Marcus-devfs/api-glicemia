const mongoose = require("mongoose");
const { Schema } = mongoose;

const feedbackSchema = new Schema({
  userId: {
    type: Schema.Types.ObjectId,
    ref: "User",
    required: true,
    index: true,
  },
  category: {
    type: String,
    enum: ["feedback", "help", "bug"],
    required: true,
  },
  message: {
    type: String,
    required: true,
    maxlength: 2000,
    trim: true,
  },
  status: {
    type: String,
    enum: ["open", "read", "resolved"],
    default: "open",
    index: true,
  },
  userAgent: { type: String, default: null },
  createdAt: { type: Date, default: Date.now, index: true },
});

const Feedback = mongoose.model("Feedback", feedbackSchema);

module.exports = Feedback;
