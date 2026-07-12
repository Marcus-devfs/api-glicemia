const User = require("../../models/User");
const { sendPushNotification, isPushConfigured } = require("./webPush");

async function sendPushToUser(userOrId, payload) {
  if (!isPushConfigured()) return { sent: 0, failed: 0, skipped: "not_configured" };

  const user =
    userOrId?.pushSubscriptions != null
      ? userOrId
      : await User.findById(userOrId);

  if (!user?.pushSubscriptions?.length) {
    return { sent: 0, failed: 0, skipped: "no_subscriptions" };
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

  return { sent, failed };
}

module.exports = { sendPushToUser };
