const mongoose = require("mongoose");
const { Schema } = mongoose;

const PUSH_TYPES = [
  "meal_reminder",
  "premium_activated",
  "payment_pending",
  "checkout_reminder",
  "generic",
];

const PUSH_STATUSES = ["delivered", "partial", "failed", "skipped"];

const pushDeliverySchema = new Schema({
  userId: {
    type: Schema.Types.ObjectId,
    ref: "User",
    required: true,
    index: true,
  },
  type: {
    type: String,
    enum: PUSH_TYPES,
    default: "generic",
    index: true,
  },
  title: { type: String, default: "" },
  body: { type: String, default: "" },
  url: { type: String, default: null },
  status: {
    type: String,
    enum: PUSH_STATUSES,
    required: true,
    index: true,
  },
  devicesSent: { type: Number, default: 0 },
  devicesFailed: { type: Number, default: 0 },
  skipReason: { type: String, default: null },
  meta: {
    period: { type: String, default: null },
    slotId: { type: String, default: null },
    paymentMethod: { type: String, default: null },
    paymentId: { type: Schema.Types.ObjectId, default: null },
  },
  createdAt: { type: Date, default: Date.now, index: true },
});

pushDeliverySchema.index({ createdAt: -1, type: 1 });

const PushDelivery = mongoose.model("PushDelivery", pushDeliverySchema);

module.exports = PushDelivery;
module.exports.PUSH_TYPES = PUSH_TYPES;
module.exports.PUSH_STATUSES = PUSH_STATUSES;
