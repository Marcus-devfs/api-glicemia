const { DEFAULT_TIMEZONE } = require("./constants");

function getCurrentHourInTimezone(timezone = DEFAULT_TIMEZONE, date = new Date()) {
  try {
    const parts = new Intl.DateTimeFormat("en-US", {
      timeZone: timezone,
      hour: "numeric",
      hour12: false,
    }).formatToParts(date);
    const hour = parseInt(parts.find((p) => p.type === "hour")?.value ?? "0", 10);
    return hour === 24 ? 0 : hour;
  } catch {
    return date.getHours();
  }
}

function getCurrentMinuteInTimezone(timezone = DEFAULT_TIMEZONE, date = new Date()) {
  try {
    const parts = new Intl.DateTimeFormat("en-US", {
      timeZone: timezone,
      minute: "numeric",
      hour12: false,
    }).formatToParts(date);
    return parseInt(parts.find((p) => p.type === "minute")?.value ?? "0", 10);
  } catch {
    return date.getMinutes();
  }
}

function getTodayInTimezone(timezone = DEFAULT_TIMEZONE) {
  try {
    return new Intl.DateTimeFormat("en-CA", {
      timeZone: timezone,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    }).format(new Date());
  } catch {
    return new Date().toISOString().split("T")[0];
  }
}

function resolveUserTimezone(timezone) {
  if (!timezone) return DEFAULT_TIMEZONE;
  try {
    Intl.DateTimeFormat(undefined, { timeZone: timezone });
    return timezone;
  } catch {
    return DEFAULT_TIMEZONE;
  }
}

function formatDateInTimezone(date, timezone = DEFAULT_TIMEZONE) {
  try {
    return new Intl.DateTimeFormat("en-CA", {
      timeZone: timezone,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    }).format(new Date(date));
  } catch {
    return new Date(date).toISOString().split("T")[0];
  }
}

function parseTime(time) {
  const [hour, minute] = time.split(":").map(Number);
  return { hour: hour ?? 0, minute: minute ?? 0 };
}

function isWithinSlotWindow(currentHour, currentMinute, slotHour, slotMinute, windowMinutes) {
  const current = currentHour * 60 + currentMinute;
  const slot = slotHour * 60 + slotMinute;
  return Math.abs(current - slot) <= windowMinutes;
}

module.exports = {
  getCurrentHourInTimezone,
  getCurrentMinuteInTimezone,
  getTodayInTimezone,
  resolveUserTimezone,
  formatDateInTimezone,
  parseTime,
  isWithinSlotWindow,
};
