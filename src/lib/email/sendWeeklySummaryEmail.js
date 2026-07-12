const { sendMail } = require("./sendMail");
const { weeklySummaryHtml } = require("./templates/weeklySummary");
const { getGestationalWeek } = require("../reports/stats");

async function sendWeeklySummaryEmail(user, stats) {
  if (!user?.email) return;

  const appUrl = process.env.APP_URL || "https://app.gestaglic.com.br";
  const gestationalWeek = getGestationalWeek(user.pregnancy?.dueDate);

  await sendMail({
    to: user.email,
    subject: `Resumo semanal — ${stats.inTargetPct}% dentro da meta · GestaGlic`,
    html: weeklySummaryHtml({
      name: user.name,
      stats,
      appUrl,
      gestationalWeek,
      fetusCount: user.pregnancy?.fetusCount || 1,
    }),
  });
}

module.exports = { sendWeeklySummaryEmail };
