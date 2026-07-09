const MEAL_ICONS = {
  Jejum: "🌅",
  "Após Café": "☕",
  "Após Almoço": "🍽️",
  "Após Jantar": "🌙",
};

function getFirstName(fullName) {
  if (!fullName) return "";
  return fullName.split(" ")[0];
}

function buildPushPayload(user, reminder) {
  const firstName = getFirstName(user.name);
  const icon = MEAL_ICONS[reminder.period] ?? "💗";
  const greeting = firstName ? `${firstName}, ` : "";

  return {
    title: "Hora de medir a glicemia 💗",
    body: `${icon} ${greeting}${reminder.label}`,
    url: "/medicao",
  };
}

module.exports = { buildPushPayload };
