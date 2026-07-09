const Medicao = require("../../models/Medicao");
const { DEFAULT_MEAL_REMINDERS, SLOT_WINDOW_MINUTES } = require("./constants");
const {
  getCurrentHourInTimezone,
  getCurrentMinuteInTimezone,
  getTodayInTimezone,
  resolveUserTimezone,
  formatDateInTimezone,
  parseTime,
  isWithinSlotWindow,
} = require("./timezone");

async function hasMeasurementToday(userId, period, today, timezone) {
  const markings = await Medicao.find({ userId, period }).exec();
  return markings.some((m) => formatDateInTimezone(m.date, timezone) === today);
}

function getUserReminders(user) {
  const stored = user.preferences?.reminders;
  if (Array.isArray(stored) && stored.length > 0) return stored;
  return DEFAULT_MEAL_REMINDERS;
}

function evaluateMealReminders({ user, force = false }) {
  const timezone = resolveUserTimezone(user.preferences?.timezone);
  const today = getTodayInTimezone(timezone);
  const currentHour = getCurrentHourInTimezone(timezone);
  const currentMinute = getCurrentMinuteInTimezone(timezone);
  const sentSlots =
    user.notificationState?.date === today ? user.notificationState.sentSlots ?? [] : [];

  const reminders = getUserReminders(user);
  const matches = [];

  for (const reminder of reminders) {
    const { hour, minute } = parseTime(reminder.time);
    const inWindow = isWithinSlotWindow(
      currentHour,
      currentMinute,
      hour,
      minute,
      SLOT_WINDOW_MINUTES
    );

    if (!force && !inWindow) continue;
    if (sentSlots.includes(reminder.id)) continue;

    matches.push({ reminder, reason: force ? "forced" : "slot_match" });
  }

  return { timezone, today, sentSlots, matches };
}

module.exports = {
  hasMeasurementToday,
  getUserReminders,
  evaluateMealReminders,
};
