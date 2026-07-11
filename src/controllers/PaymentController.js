const UserModel = require("../models/User");
const PixPaymentModel = require("../models/PixPayment");
const { PREMIUM_PRICE } = require("../config/premium");
const {
  createPremiumCheckout,
  buildCheckoutUrl,
} = require("../lib/asaas/client");
const { activatePremium } = require("../lib/asaas/activatePremium");

const PAID_EVENTS = new Set([
  "PAYMENT_RECEIVED",
  "PAYMENT_CONFIRMED",
  "CHECKOUT_PAID",
]);

class PaymentController {
  createCheckout = async (req, res) => {
    try {
      const userId = req.currentUser.userId;
      const user = await UserModel.findById(userId);

      if (!user) return res.status(404).json({ msg: "Usuária não encontrada" });
      if (user.is_premium) {
        return res.status(400).json({ msg: "Você já tem acesso premium" });
      }

      const recentPending = await PixPaymentModel.findOne({
        userId,
        status: { $in: ["pending", "generated"] },
        checkoutUrl: { $ne: null },
        createdAt: { $gte: new Date(Date.now() - 55 * 60 * 1000) },
      }).sort({ createdAt: -1 });

      if (recentPending?.checkoutUrl) {
        return res.status(200).json({ checkoutUrl: recentPending.checkoutUrl });
      }

      const appUrl = process.env.APP_URL || "https://app.gestaglic.com.br";
      const checkout = await createPremiumCheckout(user, appUrl);
      const checkoutUrl = buildCheckoutUrl(checkout);

      let payment = await PixPaymentModel.findOne({
        userId,
        status: { $in: ["pending", "generated"] },
        checkoutUrl: null,
      }).sort({ createdAt: -1 });

      if (payment) {
        payment.status = "pending";
        payment.asaasCheckoutId = checkout.id;
        payment.checkoutUrl = checkoutUrl;
        payment.amount = PREMIUM_PRICE;
        await payment.save();
      } else {
        await PixPaymentModel.create({
          userId,
          amount: PREMIUM_PRICE,
          status: "pending",
          asaasCheckoutId: checkout.id,
          checkoutUrl,
        });
      }

      res.status(200).json({ checkoutUrl });
    } catch (error) {
      console.log("createCheckout error:", error.message, error.asaas);
      res.status(500).json({
        msg: error.message || "Erro ao criar checkout",
      });
    }
  };

  asaasWebhook = async (req, res) => {
    try {
      const webhookToken = process.env.ASAAS_WEBHOOK_TOKEN;
      const incomingToken = req.headers["asaas-access-token"];

      if (webhookToken && incomingToken !== webhookToken) {
        return res.status(401).json({ msg: "Unauthorized" });
      }

      const { event, payment, checkout } = req.body;

      if (!PAID_EVENTS.has(event)) {
        return res.status(200).json({ received: true });
      }

      const userId =
        payment?.externalReference ||
        checkout?.externalReference ||
        req.body?.externalReference;

      if (!userId) {
        console.log("[asaas webhook] sem externalReference", event);
        return res.status(200).json({ received: true });
      }

      await activatePremium(userId, {
        asaasPaymentId: payment?.id,
        asaasCheckoutId: checkout?.id,
      });

      console.log("[asaas webhook] premium ativado", userId, event);
      res.status(200).json({ received: true });
    } catch (error) {
      console.log("asaasWebhook error:", error);
      res.status(200).json({ received: true });
    }
  };

  getPremiumStatus = async (req, res) => {
    try {
      const userId = req.currentUser.userId;
      const user = await UserModel.findById(userId).select(
        "is_premium pdf_downloads_count"
      );

      if (!user) return res.status(404).json({ msg: "Usuária não encontrada" });

      const pending = await PixPaymentModel.findOne({
        userId,
        status: { $in: ["pending", "generated"] },
      }).sort({ createdAt: -1 });

      res.status(200).json({
        is_premium: user.is_premium,
        pdf_downloads_count: user.pdf_downloads_count,
        pendingCheckoutUrl: pending?.checkoutUrl || null,
      });
    } catch (error) {
      res.status(500).json({ msg: "Erro" });
    }
  };
}

module.exports = new PaymentController();
