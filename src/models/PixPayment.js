const mongoose = require("mongoose");
const { Schema } = mongoose;

const pixPaymentSchema = new Schema({
  userId: {
    type: Schema.Types.ObjectId,
    ref: "User",
    required: true,
  },
  amount: {
    type: Number,
    default: 14.9,
  },
  netAmount: {
    type: Number,
    default: null,
  },
  feeAmount: {
    type: Number,
    default: null,
  },
  status: {
    type: String,
    enum: ["generated", "pending", "paid", "expired", "cancelled"],
    default: "pending",
  },
  asaasCheckoutId: { type: String, default: null },
  asaasPaymentId: { type: String, default: null },
  checkoutUrl: { type: String, default: null },
  paymentMethod: {
    type: String,
    enum: ["pix", "card"],
    default: "pix",
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
  paidAt: {
    type: Date,
    default: null,
  },
  checkoutReminderSentAt: {
    type: Date,
    default: null,
  },
});

pixPaymentSchema.index({ userId: 1, status: 1 });
pixPaymentSchema.index({ asaasPaymentId: 1 });

const PixPayment = mongoose.model("PixPayment", pixPaymentSchema);

module.exports = PixPayment;
