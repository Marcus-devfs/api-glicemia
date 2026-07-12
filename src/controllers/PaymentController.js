const UserModel = require("../models/User");
const PixPaymentModel = require("../models/PixPayment");
const { PREMIUM_PRICE } = require("../config/premium");
const { getOrCreateCustomer } = require("../lib/asaas/customer");
const { isValidCpf } = require("../lib/asaas/cpf");
const {
  createCardCheckout,
  createPixPayment,
  getPixQrCode,
  getPayment,
  buildCheckoutUrl,
  isPaymentPaid,
  isSandbox,
} = require("../lib/asaas/client");
const { activatePremium } = require("../lib/asaas/activatePremium");

const PAID_EVENTS = new Set([
  "PAYMENT_RECEIVED",
  "PAYMENT_CONFIRMED",
  "CHECKOUT_PAID",
]);

const PIX_REUSE_MS = 23 * 60 * 60 * 1000; // QR Pix válido no mesmo dia

class PaymentController {
  /** Pix transparente — QR Code no app */
  createPix = async (req, res) => {
    try {
      const userId = req.currentUser.userId;
      const user = await UserModel.findById(userId);

      if (!user) return res.status(404).json({ msg: "Usuária não encontrada" });
      if (user.is_premium) {
        return res.status(400).json({ msg: "Você já tem acesso premium" });
      }

      let record = await PixPaymentModel.findOne({
        userId,
        paymentMethod: "pix",
        status: "pending",
        asaasPaymentId: { $ne: null },
        amount: PREMIUM_PRICE,
        createdAt: { $gte: new Date(Date.now() - PIX_REUSE_MS) },
      }).sort({ createdAt: -1 });

      let paymentId = record?.asaasPaymentId;

      if (paymentId) {
        const remote = await getPayment(paymentId);
        const priceOk = Number(remote.value) === PREMIUM_PRICE;

        if (priceOk && isPaymentPaid(remote.status)) {
          await activatePremium(userId, {
            asaasPaymentId: paymentId,
            asaasPayment: remote,
          });
          const updated = await UserModel.findById(userId);
          return res.status(200).json({
            alreadyPaid: true,
            is_premium: updated?.is_premium ?? true,
          });
        }

        if (priceOk && remote.status === "PENDING") {
          const qr = await getPixQrCode(paymentId);
          return res.status(200).json({
            paymentId,
            encodedImage: qr.encodedImage,
            payload: qr.payload,
            expirationDate: qr.expirationDate,
            amount: PREMIUM_PRICE,
            sandbox: isSandbox(),
          });
        }

        record = null;
        paymentId = null;
      }

      const customerId = await getOrCreateCustomer(user, req.body?.cpf);
      const cpfCnpj = customerId.cpfCnpj;
      if (!cpfCnpj || !isValidCpf(cpfCnpj)) {
        return res.status(400).json({
          msg: "Informe um CPF válido para gerar o Pix.",
          code: "NEED_CPF",
        });
      }

      const payment = await createPixPayment(customerId.customerId, userId);
      paymentId = payment.id;

      const qr = await getPixQrCode(paymentId);

      if (record) {
        record.asaasPaymentId = paymentId;
        record.amount = PREMIUM_PRICE;
        record.status = "pending";
        await record.save();
      } else {
        await PixPaymentModel.create({
          userId,
          amount: PREMIUM_PRICE,
          status: "pending",
          paymentMethod: "pix",
          asaasPaymentId: paymentId,
        });
      }

      res.status(200).json({
        paymentId,
        encodedImage: qr.encodedImage,
        payload: qr.payload,
        expirationDate: qr.expirationDate,
        amount: PREMIUM_PRICE,
        sandbox: isSandbox(),
      });
    } catch (error) {
      console.log("createPix error:", error.message, error.asaas);
      res.status(500).json({
        msg: error.message || "Erro ao gerar Pix",
      });
    }
  };

  /** Checkout hospedado — somente cartão */
  createCardCheckout = async (req, res) => {
    try {
      const userId = req.currentUser.userId;
      const user = await UserModel.findById(userId);

      if (!user) return res.status(404).json({ msg: "Usuária não encontrada" });
      if (user.is_premium) {
        return res.status(400).json({ msg: "Você já tem acesso premium" });
      }

      const recentPending = await PixPaymentModel.findOne({
        userId,
        paymentMethod: "card",
        status: "pending",
        checkoutUrl: { $ne: null },
        amount: PREMIUM_PRICE,
        createdAt: { $gte: new Date(Date.now() - 55 * 60 * 1000) },
      }).sort({ createdAt: -1 });

      if (recentPending?.checkoutUrl) {
        return res.status(200).json({ checkoutUrl: recentPending.checkoutUrl });
      }

      // Invalida checkouts pendentes com preço antigo (ex.: R$ 9,90)
      await PixPaymentModel.updateMany(
        {
          userId,
          paymentMethod: "card",
          status: "pending",
          amount: { $ne: PREMIUM_PRICE },
        },
        { $set: { status: "generated", checkoutUrl: null, asaasCheckoutId: null } }
      );

      const appUrl = process.env.APP_URL || "https://app.gestaglic.com.br";
      const checkout = await createCardCheckout(userId, appUrl);
      const checkoutUrl = buildCheckoutUrl(checkout);

      let payment = await PixPaymentModel.findOne({
        userId,
        status: { $in: ["pending", "generated"] },
        paymentMethod: "card",
        checkoutUrl: null,
      }).sort({ createdAt: -1 });

      if (payment) {
        payment.status = "pending";
        payment.paymentMethod = "card";
        payment.asaasCheckoutId = checkout.id;
        payment.checkoutUrl = checkoutUrl;
        payment.amount = PREMIUM_PRICE;
        await payment.save();
      } else {
        await PixPaymentModel.create({
          userId,
          amount: PREMIUM_PRICE,
          status: "pending",
          paymentMethod: "card",
          asaasCheckoutId: checkout.id,
          checkoutUrl,
        });
      }

      res.status(200).json({ checkoutUrl });
    } catch (error) {
      console.log("createCardCheckout error:", error.message, error.asaas);
      res.status(500).json({
        msg: error.message || "Erro ao criar checkout",
      });
    }
  };

  /** @deprecated use createCardCheckout */
  createCheckout = (req, res) => this.createCardCheckout(req, res);

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
        asaasPayment: payment,
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
      let user = await UserModel.findById(userId).select(
        "is_premium pdf_downloads_count"
      );

      if (!user) return res.status(404).json({ msg: "Usuária não encontrada" });

      const pendingPix = await PixPaymentModel.findOne({
        userId,
        paymentMethod: "pix",
        status: "pending",
        asaasPaymentId: { $ne: null },
      }).sort({ createdAt: -1 });

      if (!user.is_premium && pendingPix?.asaasPaymentId) {
        try {
          const remote = await getPayment(pendingPix.asaasPaymentId);
          if (isPaymentPaid(remote.status)) {
            await activatePremium(userId, {
              asaasPaymentId: pendingPix.asaasPaymentId,
              asaasPayment: remote,
            });
            user = await UserModel.findById(userId).select(
              "is_premium pdf_downloads_count"
            );
          }
        } catch (syncErr) {
          console.log("getPremiumStatus sync:", syncErr.message);
        }
      }

      const pendingCard = await PixPaymentModel.findOne({
        userId,
        paymentMethod: "card",
        status: { $in: ["pending", "generated"] },
      }).sort({ createdAt: -1 });

      res.status(200).json({
        is_premium: user.is_premium,
        pdf_downloads_count: user.pdf_downloads_count,
        pendingCheckoutUrl: pendingCard?.checkoutUrl || null,
        sandbox: isSandbox(),
      });
    } catch (error) {
      res.status(500).json({ msg: "Erro" });
    }
  };
}

module.exports = new PaymentController();
