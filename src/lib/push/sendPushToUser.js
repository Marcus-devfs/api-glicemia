const User = require("../../models/User");
const PushDelivery = require("../../models/PushDelivery");
const { sendPushNotification, isPushConfigured } = require("./webPush");

function resolveStatus({ sent, failed, skipped }) {
  if (skipped) return "skipped";
  if (sent > 0 && failed > 0) return "partial";
  if (sent > 0) return "delivered";
  if (failed > 0) return "failed";
  return "skipped";
}

async function logPushDelivery(user, payload, result, meta = {}) {
  try {
    const status = resolveStatus(result);
    await PushDelivery.create({
      userId: user._id,
      type: meta.type || "generic",
      title: payload?.title || "",
      body: payload?.body || "",
      url: payload?.url || null,
      status,
      devicesSent: result.sent || 0,
      devicesFailed: result.failed || 0,
      skipReason: result.skipped || null,
      meta: {
        period: meta.period || null,
        slotId: meta.slotId || null,
        paymentMethod: meta.paymentMethod || null,
        paymentId: meta.paymentId || null,
      },
    });
  } catch (err) {
    console.log("push delivery log error:", err.message);
  }
}

/**
 * @param {object|string} userOrId
 * @param {{ title: string, body: string, url?: string }} payload
 * @param {{ type?: string, period?: string, slotId?: string, paymentMethod?: string, paymentId?: string, log?: boolean }} meta
 */
async function sendPushToUser(userOrId, payload, meta = {}) {
  const shouldLog = meta.log !== false;

  if (!isPushConfigured()) {
    const result = { sent: 0, failed: 0, skipped: "not_configured" };
    if (shouldLog && userOrId) {
      const user =
        userOrId?.pushSubscriptions != null ? userOrId : await User.findById(userOrId).catch(() => null);
      if (user) await logPushDelivery(user, payload, result, meta);
    }
    return result;
  }

  const user =
    userOrId?.pushSubscriptions != null ? userOrId : await User.findById(userOrId);

  if (!user) {
    return { sent: 0, failed: 0, skipped: "user_not_found" };
  }

  if (!user.pushSubscriptions?.length) {
    const result = { sent: 0, failed: 0, skipped: "no_subscriptions" };
    if (shouldLog) await logPushDelivery(user, payload, result, meta);
    return result;
  }

  let sent = 0;
  let failed = 0;

  for (const sub of user.pushSubscriptions) {
    try {
      await sendPushNotification(sub, payload);
      sent++;
    } catch {
      failed++;
      await User.findByIdAndUpdate(user._id, {
        $pull: { pushSubscriptions: { endpoint: sub.endpoint } },
      });
    }
  }

  const result = { sent, failed };
  if (shouldLog) await logPushDelivery(user, payload, result, meta);
  return result;
}

module.exports = { sendPushToUser, logPushDelivery };
