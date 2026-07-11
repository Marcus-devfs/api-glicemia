const AccessLog = require("../models/AccessLog");

function getClientIp(req) {
  const forwarded = req.headers["x-forwarded-for"];
  if (typeof forwarded === "string") return forwarded.split(",")[0].trim();
  return req.socket?.remoteAddress ?? null;
}

async function logAccess(req, userId, action, metadata = null) {
  try {
    await AccessLog.create({
      userId,
      action,
      ip: getClientIp(req),
      userAgent: req.headers["user-agent"]?.slice(0, 256) ?? null,
      metadata,
    });
  } catch (err) {
    console.log("[accessLog]", err.message);
  }
}

module.exports = { logAccess };
