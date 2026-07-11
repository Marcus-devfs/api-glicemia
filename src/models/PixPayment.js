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
    default: 9.9,
  },
  status: {
    type: String,
    enum: ["generated", "pending", "paid", "expired", "cancelled"],
    default: "pending",
  },
  asaasCheckoutId: { type: String, default: null },
  asaasPaymentId: { type: String, default: null },
  checkoutUrl: { type: String, default: null },
  createdAt: {
    type: Date,
    default: Date.now,
  },
  paidAt: {
    type: Date,
    default: null,
  },
});

pixPaymentSchema.index({ userId: 1, status: 1 });
pixPaymentSchema.index({ asaasCheckoutId: 1 });

const PixPayment = mongoose.model("PixPayment", pixPaymentSchema);

module.exports = PixPayment;
