const User = require("../models/User");
const { getVapidPublicKey, isPushConfigured } = require("../lib/push/webPush");
const { processReminders } = require("../lib/push/processReminders");
const { DEFAULT_MEAL_REMINDERS } = require("../lib/push/constants");

class PushController {
  getVapidKey = (req, res) => {
    const publicKey = getVapidPublicKey();
    return res.status(200).json({
      publicKey: publicKey ?? null,
      supported: Boolean(publicKey),
    });
  };

  subscribe = async (req, res) => {
    try {
      const { userId } = req.currentUser;
      const { subscription, timezone, reminders } = req.body;

      if (!subscription?.endpoint || !subscription?.keys) {
        return res.status(400).json({ message: "Subscription inválida" });
      }

      await User.findByIdAndUpdate(userId, {
        $pull: { pushSubscriptions: { endpoint: subscription.endpoint } },
      });

      const $set = {
        "preferences.notificationsEnabled": true,
        "preferences.timezone": timezone ?? "America/Sao_Paulo",
      };

      if (Array.isArray(reminders) && reminders.length > 0) {
        $set["preferences.reminders"] = reminders;
      } else {
        const user = await User.findById(userId);
        if (!user?.preferences?.reminders?.length) {
          $set["preferences.reminders"] = DEFAULT_MEAL_REMINDERS;
        }
      }

      await User.findByIdAndUpdate(userId, {
        $push: {
          pushSubscriptions: {
            endpoint: subscription.endpoint,
            keys: subscription.keys,
            createdAt: new Date(),
          },
        },
        $set,
      });

      return res.status(200).json({ subscribed: true });
    } catch (error) {
      console.log(error);
      return res.status(500).json({ message: "Erro ao registrar push" });
    }
  };

  unsubscribe = async (req, res) => {
    try {
      const { userId } = req.currentUser;
      await User.findByIdAndUpdate(userId, {
        pushSubscriptions: [],
        "preferences.notificationsEnabled": false,
      });
      return res.status(200).json({ unsubscribed: true });
    } catch (error) {
      return res.status(500).json({ message: "Erro ao cancelar push" });
    }
  };

  updateReminders = async (req, res) => {
    try {
      const { userId: paramUserId } = req.params;
      const { userId: tokenUserId } = req.currentUser;

      if (String(paramUserId) !== String(tokenUserId)) {
        return res.status(403).json({ message: "Não autorizado" });
      }

      const { enabled, reminders, timezone } = req.body;

      const update = {};
      if (typeof enabled === "boolean") update["preferences.notificationsEnabled"] = enabled;
      if (timezone) update["preferences.timezone"] = timezone;
      if (Array.isArray(reminders)) update["preferences.reminders"] = reminders;

      const user = await User.findByIdAndUpdate(paramUserId, update, { new: true });

      return res.status(200).json({
        preferences: user.preferences,
      });
    } catch (error) {
      return res.status(500).json({ message: "Erro ao atualizar lembretes" });
    }
  };

  getReminders = async (req, res) => {
    try {
      const { userId: paramUserId } = req.params;
      const { userId: tokenUserId } = req.currentUser;

      if (String(paramUserId) !== String(tokenUserId)) {
        return res.status(403).json({ message: "Não autorizado" });
      }

      const user = await User.findById(paramUserId);
      return res.status(200).json({
        enabled: user?.preferences?.notificationsEnabled ?? false,
        timezone: user?.preferences?.timezone ?? "America/Sao_Paulo",
        reminders: user?.preferences?.reminders?.length
          ? user.preferences.reminders
          : DEFAULT_MEAL_REMINDERS,
      });
    } catch (error) {
      return res.status(500).json({ message: "Erro ao buscar lembretes" });
    }
  };

  sendReminders = async (req, res) => {
    try {
      if (!isPushConfigured()) {
        return res.status(503).json({ message: "Push not configured" });
      }

      const force = req.query.force === "1" && process.env.NODE_ENV !== "production";
      const result = await processReminders(force);

      return res.status(200).json(result);
    } catch (error) {
      console.log(error);
      return res.status(500).json({ message: "Erro ao processar lembretes" });
    }
  };
}

module.exports = new PushController();
