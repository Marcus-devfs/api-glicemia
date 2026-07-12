const JEJUM_PERIOD = "Jejum";
const POS_PERIODS = ["Após Café", "Após Almoço", "Após Jantar"];

const DEFAULT_TARGETS = {
  jejum: 95,
  pos1h: 179,
  pos2h: 152,
};

function getTargets(user) {
  const t = user?.glucoseTargets;
  return {
    jejum: t?.jejum ?? DEFAULT_TARGETS.jejum,
    pos1h: t?.pos1h ?? DEFAULT_TARGETS.pos1h,
    pos2h: t?.pos2h ?? DEFAULT_TARGETS.pos2h,
  };
}

function getGlucoseStatus(value, period, targets = DEFAULT_TARGETS) {
  if (period === JEJUM_PERIOD) {
    if (value < targets.jejum) return "normal";
    if (value <= targets.jejum + 10) return "warning";
    return "danger";
  }
  if (value < targets.pos1h) return "normal";
  if (value <= targets.pos1h + 20) return "warning";
  return "danger";
}

function calcAverage(values) {
  if (!values?.length) return 0;
  return Math.round(values.reduce((a, b) => a + b, 0) / values.length);
}

function filterMarkingsSince(markings, days) {
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - days);
  cutoff.setHours(0, 0, 0, 0);
  return markings.filter((m) => new Date(m.date) >= cutoff);
}

function computeReportStats(markings, user, days = null) {
  const filtered = days != null ? filterMarkingsSince(markings, days) : markings;
  const targets = getTargets(user);

  const jejumValues = filtered
    .filter((m) => m.period === JEJUM_PERIOD)
    .map((m) => m.value);
  const posValues = filtered
    .filter((m) => POS_PERIODS.includes(m.period))
    .map((m) => m.value);

  const inTarget = filtered.filter(
    (m) => getGlucoseStatus(m.value, m.period, targets) === "normal"
  ).length;
  const total = filtered.length;

  const byPeriod = [JEJUM_PERIOD, ...POS_PERIODS].map((period) => {
    const items = filtered.filter((m) => m.period === period);
    const avg = calcAverage(items.map((m) => m.value));
    return {
      period,
      count: items.length,
      avg,
      status: avg > 0 ? getGlucoseStatus(avg, period, targets) : null,
    };
  });

  return {
    jejumAvg: calcAverage(jejumValues),
    aposAvg: calcAverage(posValues),
    inTargetPct: total ? Math.round((inTarget / total) * 100) : 0,
    inTarget,
    total,
    byPeriod,
    targets,
    periodDays: days,
  };
}

function getGestationalWeek(dueDate) {
  if (!dueDate) return null;
  const dpp = new Date(dueDate);
  const today = new Date();
  today.setHours(12, 0, 0, 0);
  dpp.setHours(12, 0, 0, 0);
  const daysToDpp = Math.ceil((dpp - today) / 86400000);
  const daysPregnant = 280 - daysToDpp;
  const week = Math.floor(daysPregnant / 7);
  if (week < 1 || week > 42) return null;
  return week;
}

function sanitizePatientName(name) {
  if (!name) return "Paciente";
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return parts[0];
  return `${parts[0]} ${parts[parts.length - 1].charAt(0).toUpperCase()}.`;
}

module.exports = {
  JEJUM_PERIOD,
  POS_PERIODS,
  DEFAULT_TARGETS,
  getTargets,
  getGlucoseStatus,
  calcAverage,
  filterMarkingsSince,
  computeReportStats,
  getGestationalWeek,
  sanitizePatientName,
};
