const webpush = require("web-push");

const publicKey = process.env.VAPID_PUBLIC_KEY;
const privateKey = process.env.VAPID_PRIVATE_KEY;
const subject = process.env.VAPID_SUBJECT ?? "mailto:support@gestaglic.app";

function isPushConfigured() {
  return Boolean(publicKey && privateKey);
}

function getVapidPublicKey() {
  return publicKey;
}

function configureWebPush() {
  if (!isPushConfigured()) return false;
  webpush.setVapidDetails(subject, publicKey, privateKey);
  return true;
}

async function sendPushNotification(subscription, payload) {
  if (!configureWebPush()) {
    throw new Error("Push notifications not configured");
  }

  await webpush.sendNotification(
    {
      endpoint: subscription.endpoint,
      keys: subscription.keys,
    },
    JSON.stringify(payload)
  );
}

module.exports = {
  isPushConfigured,
  getVapidPublicKey,
  configureWebPush,
  sendPushNotification,
};
