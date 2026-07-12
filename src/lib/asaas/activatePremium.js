const UserModel = require("../../models/User");
const PixPaymentModel = require("../../models/PixPayment");
const { getPremiumPrice } = require("../../lib/appSettings");
const {
  extractFeesFromAsaasPayment,
  fetchPaymentFees,
} = require("../asaas/paymentFees");

async function resolveFeeData({ asaasPaymentId, asaasPayment } = {}) {
  if (asaasPayment?.value != null) {
    return extractFeesFromAsaasPayment(asaasPayment);
  }

  if (!asaasPaymentId) return {};

  try {
    return await fetchPaymentFees(asaasPaymentId);
  } catch (err) {
    console.log("activatePremium fetch fees:", err.message);
    return {};
  }
}

async function activatePremium(
  userId,
  { asaasPaymentId, asaasCheckoutId, asaasPayment } = {}
) {
  if (!userId) return null;

  const feeData = await resolveFeeData({ asaasPaymentId, asaasPayment });

  const user = await UserModel.findByIdAndUpdate(
    userId,
    { is_premium: true },
    { new: true }
  );

  if (!user) return null;

  const paymentUpdate = {
    status: "paid",
    paidAt: new Date(),
    ...(asaasPaymentId && { asaasPaymentId }),
    ...(asaasCheckoutId && { asaasCheckoutId }),
    ...(feeData.amount != null && feeData.amount > 0 && { amount: feeData.amount }),
    ...(feeData.netAmount != null && { netAmount: feeData.netAmount }),
    ...(feeData.feeAmount != null && { feeAmount: feeData.feeAmount }),
  };

  const updated = await PixPaymentModel.findOneAndUpdate(
    { userId, status: { $in: ["pending", "generated"] } },
    paymentUpdate,
    { sort: { createdAt: -1 }, new: true }
  );

  if (!updated) {
    const fallbackPrice = await getPremiumPrice();
    await PixPaymentModel.create({
      userId,
      amount: feeData.amount || fallbackPrice,
      netAmount: feeData.netAmount ?? null,
      feeAmount: feeData.feeAmount ?? null,
      status: "paid",
      paidAt: new Date(),
      asaasPaymentId: asaasPaymentId || null,
      asaasCheckoutId: asaasCheckoutId || null,
    });
  }

  return user;
}

module.exports = { activatePremium, resolveFeeData };
