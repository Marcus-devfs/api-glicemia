const UserModel = require("../../models/User");
const PixPaymentModel = require("../../models/PixPayment");
const { PREMIUM_PRICE } = require("../../config/premium");

async function activatePremium(userId, { asaasPaymentId, asaasCheckoutId } = {}) {
  if (!userId) return null;

  const user = await UserModel.findByIdAndUpdate(
    userId,
    { is_premium: true },
    { new: true }
  );

  if (!user) return null;

  const updated = await PixPaymentModel.findOneAndUpdate(
    { userId, status: { $in: ["pending", "generated"] } },
    {
      status: "paid",
      paidAt: new Date(),
      ...(asaasPaymentId && { asaasPaymentId }),
      ...(asaasCheckoutId && { asaasCheckoutId }),
    },
    { sort: { createdAt: -1 }, new: true }
  );

  if (!updated) {
    await PixPaymentModel.create({
      userId,
      amount: PREMIUM_PRICE,
      status: "paid",
      paidAt: new Date(),
      asaasPaymentId: asaasPaymentId || null,
      asaasCheckoutId: asaasCheckoutId || null,
    });
  }

  return user;
}

module.exports = { activatePremium };
