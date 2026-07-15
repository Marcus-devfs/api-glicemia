const User = require("../../models/User");
const { sendPushToUser } = require("./sendPushToUser");
const { buildPushPayload } = require("./messages");
const { evaluateMealReminders, hasMeasurementToday } = require("./scheduler");

async function markSlotSent(userId, today, sentSlots, slotId) {
  const nextSlots = sentSlots.includes(slotId) ? sentSlots : [...sentSlots, slotId];
  await User.findByIdAndUpdate(userId, {
    notificationState: {
      date: today,
      sentSlots: nextSlots,
    },
  });
  return nextSlots;
}

async function processReminders(force = false) {
  const candidates = await User.find({
    "preferences.notificationsEnabled": true,
    pushSubscriptions: { $exists: true, $not: { $size: 0 } },
  });

  let sent = 0;
  let failed = 0;
  let matched = 0;
  const skipped = {};

  const bumpSkip = (reason) => {
    skipped[reason] = (skipped[reason] ?? 0) + 1;
  };

  for (const user of candidates) {
    const { timezone, today, sentSlots, matches } = evaluateMealReminders({ user, force });

    if (!matches.length) {
      bumpSkip("no_slot_match");
      continue;
    }

    let currentSentSlots = [...sentSlots];

    for (const { reminder } of matches) {
      const alreadyMeasured = await hasMeasurementToday(user._id, reminder.period, today, timezone);
      if (alreadyMeasured) {
        bumpSkip("already_measured_today");
        currentSentSlots = await markSlotSent(user._id, today, currentSentSlots, reminder.id);
        continue;
      }

      if (currentSentSlots.includes(reminder.id)) {
        bumpSkip("already_sent_today");
        continue;
      }

      matched++;
      const payload = buildPushPayload(user, reminder);
      const result = await sendPushToUser(user, payload, {
        type: "meal_reminder",
        period: reminder.period,
        slotId: reminder.id,
      });

      sent += result.sent || 0;
      failed += result.failed || 0;

      if (result.sent > 0) {
        currentSentSlots = await markSlotSent(user._id, today, currentSentSlots, reminder.id);
      }
    }
  }

  return {
    sent,
    failed,
    candidates: candidates.length,
    matched,
    skipped,
    force,
    hint:
      sent === 0
        ? "no_slot_match = fora do horário. already_measured_today = já registrou. already_sent_today = push já enviado. Configure cron a cada 15 min."
        : undefined,
  };
}

module.exports = { processReminders };
