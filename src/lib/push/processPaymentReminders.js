const User = require("../../models/User");
const PixPayment = require("../../models/PixPayment");
const { sendPushToUser } = require("./sendPushToUser");
const {
  buildPremiumSuccessPayload,
  buildPaymentPendingPayload,
  buildCheckoutReminderPayload,
} = require("./messages");

const CARD_REMINDER_AFTER_MS = 45 * 60 * 1000;
const PIX_REMINDER_AFTER_MS = 2 * 60 * 60 * 1000;
const CARD_EXPIRE_MS = 55 * 60 * 1000;
const PIX_EXPIRE_MS = 23 * 60 * 60 * 1000;

async function sendPremiumActivatedPush(userId) {
  const user = await User.findById(userId);
  if (!user) return { sent: 0 };

  const payload = buildPremiumSuccessPayload(user);
  return sendPushToUser(user, payload, { type: "premium_activated" });
}

async function sendPaymentPendingPush(userId, { amount, method }) {
  const user = await User.findById(userId);
  if (!user || user.is_premium) return { sent: 0 };

  const payload = buildPaymentPendingPayload(user, { amount, method });
  return sendPushToUser(user, payload, {
    type: "payment_pending",
    paymentMethod: method,
  });
}

async function processPaymentReminders(force = false) {
  const now = Date.now();
  const cardCutoff = new Date(now - (force ? 0 : CARD_REMINDER_AFTER_MS));
  const pixCutoff = new Date(now - (force ? 0 : PIX_REMINDER_AFTER_MS));

  const candidates = await PixPayment.find({
    status: "pending",
    checkoutReminderSentAt: null,
    $or: [
      {
        paymentMethod: "card",
        checkoutUrl: { $ne: null },
        createdAt: { $lte: cardCutoff },
      },
      {
        paymentMethod: "pix",
        asaasPaymentId: { $ne: null },
        createdAt: { $lte: pixCutoff },
      },
    ],
  });

  let sent = 0;
  let skipped = 0;
  let expired = 0;

  for (const payment of candidates) {
    const user = await User.findById(payment.userId);
    if (!user || user.is_premium) {
      skipped++;
      continue;
    }

    if (!user.pushSubscriptions?.length) {
      skipped++;
      continue;
    }

    const age = now - payment.createdAt.getTime();
    const maxAge = payment.paymentMethod === "card" ? CARD_EXPIRE_MS : PIX_EXPIRE_MS;

    if (age > maxAge) {
      await PixPayment.findByIdAndUpdate(payment._id, { status: "expired" });
      expired++;
      continue;
    }

    const payload = buildCheckoutReminderPayload(user, payment);
    const result = await sendPushToUser(user, payload, {
      type: "checkout_reminder",
      paymentMethod: payment.paymentMethod,
      paymentId: payment._id,
    });

    if (result.sent > 0) {
      await PixPayment.findByIdAndUpdate(payment._id, {
        checkoutReminderSentAt: new Date(),
      });
      sent++;
    } else {
      skipped++;
    }
  }

  return {
    sent,
    skipped,
    expired,
    candidates: candidates.length,
    force,
    hint:
      sent === 0
        ? "Lembretes: cartão após 45 min, Pix após 2h. Máx. 1 push por checkout pendente."
        : undefined,
  };
}

module.exports = {
  sendPremiumActivatedPush,
  sendPaymentPendingPush,
  processPaymentReminders,
};
