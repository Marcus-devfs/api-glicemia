const DEFAULT_TIMEZONE = "America/Sao_Paulo";

const DEFAULT_MEAL_REMINDERS = [
  { id: "1", period: "Jejum", time: "07:00", label: "Medir glicemia em jejum" },
  { id: "2", period: "Após Café", time: "09:30", label: "Medir glicemia após o café" },
  { id: "3", period: "Após Almoço", time: "14:00", label: "Medir glicemia após o almoço" },
  { id: "4", period: "Após Jantar", time: "20:30", label: "Medir glicemia após o jantar" },
];

/** Janela em minutos para o cron bater no horário (use cron a cada 15 min) */
const SLOT_WINDOW_MINUTES = 7;

module.exports = {
  DEFAULT_TIMEZONE,
  DEFAULT_MEAL_REMINDERS,
  SLOT_WINDOW_MINUTES,
};
