function weeklySummaryHtml({ name, stats, appUrl, gestationalWeek, fetusCount, babyName, babySex }) {
  const firstName = name?.split(" ")[0] || "";
  const reportUrl = `${appUrl}/relatorio`;

  let hello = firstName ? `Oi, ${firstName}! 👋` : "Oi! 👋";
  const baby = String(babyName || "").trim();
  if (baby) {
    const article =
      babySex === "feminino" ? `da ${baby}` : babySex === "masculino" ? `do ${baby}` : `de ${baby}`;
    hello = `Oi, mamãe ${article}! 💗`;
  }

  const periodRows = (stats.byPeriod || [])
    .filter((p) => p.count > 0)
    .map(
      (p) =>
        `<tr>
          <td style="padding:8px;border-bottom:1px solid #f3f4f6">${p.period}</td>
          <td style="padding:8px;border-bottom:1px solid #f3f4f6;text-align:center">${p.avg} mg/dL</td>
          <td style="padding:8px;border-bottom:1px solid #f3f4f6;text-align:center">${p.count}</td>
        </tr>`
    )
    .join("");

  const gestationLine =
    gestationalWeek != null
      ? `<p style="margin:0 0 16px;color:#6b7280;font-size:14px">Semana gestacional: <strong>${gestationalWeek}ª</strong>${fetusCount > 1 ? ` · ${fetusCount} fetos` : ""}</p>`
      : "";

  return `
<!DOCTYPE html>
<html lang="pt-BR">
<head><meta charset="UTF-8"></head>
<body style="margin:0;font-family:Arial,sans-serif;background:#fdf2f8;padding:24px">
  <div style="max-width:480px;margin:0 auto;background:#fff;border-radius:16px;overflow:hidden;box-shadow:0 4px 16px rgba(0,0,0,0.08)">
    <div style="background:#db2777;padding:24px;text-align:center">
      <p style="margin:0;color:#fff;font-size:20px;font-weight:bold">GestaGlic</p>
      <p style="margin:6px 0 0;color:#fce7f3;font-size:13px">Resumo semanal da glicemia</p>
    </div>
    <div style="padding:28px 24px">
      <p style="margin:0 0 12px;color:#374151;font-size:16px">${hello}</p>
      ${gestationLine}
      <p style="margin:0 0 20px;color:#6b7280;font-size:14px;line-height:1.6">
        Seu resumo dos <strong>últimos 7 dias</strong> está pronto. Use na consulta ou abra o app para mais detalhes.
      </p>
      <div style="display:flex;gap:8px;margin-bottom:20px">
        <div style="flex:1;background:#fdf2f8;border-radius:12px;padding:12px;text-align:center">
          <p style="margin:0;font-size:11px;color:#9ca3af">Dentro da meta</p>
          <p style="margin:4px 0 0;font-size:20px;font-weight:bold;color:#db2777">${stats.inTargetPct}%</p>
        </div>
        <div style="flex:1;background:#fdf2f8;border-radius:12px;padding:12px;text-align:center">
          <p style="margin:0;font-size:11px;color:#9ca3af">Média jejum</p>
          <p style="margin:4px 0 0;font-size:20px;font-weight:bold;color:#db2777">${stats.jejumAvg || "—"}${stats.jejumAvg ? " <span style='font-size:12px;font-weight:normal'>mg/dL</span>" : ""}</p>
        </div>
        <div style="flex:1;background:#fdf2f8;border-radius:12px;padding:12px;text-align:center">
          <p style="margin:0;font-size:11px;color:#9ca3af">Medições</p>
          <p style="margin:4px 0 0;font-size:20px;font-weight:bold;color:#db2777">${stats.total}</p>
        </div>
      </div>
      ${
        periodRows
          ? `<table style="width:100%;border-collapse:collapse;font-size:13px;color:#374151;margin-bottom:20px">
        <thead><tr style="background:#fdf2f8">
          <th style="padding:8px;text-align:left;font-size:11px;color:#9ca3af">Período</th>
          <th style="padding:8px;font-size:11px;color:#9ca3af">Média</th>
          <th style="padding:8px;font-size:11px;color:#9ca3af">Nº</th>
        </tr></thead>
        <tbody>${periodRows}</tbody>
      </table>`
          : ""
      }
      <a href="${reportUrl}" style="display:block;text-align:center;background:#db2777;color:#fff;text-decoration:none;padding:14px;border-radius:12px;font-weight:bold">
        Ver relatório completo
      </a>
      <p style="margin:20px 0 0;color:#9ca3af;font-size:11px;line-height:1.5">
        Você recebe este e-mail porque ativou o resumo semanal no Kit Consulta Premium.
        Desative em Perfil → Premium.
      </p>
    </div>
  </div>
</body>
</html>`;
}

module.exports = { weeklySummaryHtml };
