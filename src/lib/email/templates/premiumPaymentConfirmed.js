function premiumPaymentConfirmedHtml({ name, appUrl }) {
  const firstName = name?.split(" ")[0] || "Olá";
  const reportUrl = `${appUrl}/relatorio`;

  return `
<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin:0;font-family:Arial,sans-serif;background:#fdf2f8;padding:24px">
  <div style="max-width:480px;margin:0 auto;background:#fff;border-radius:16px;overflow:hidden;box-shadow:0 4px 16px rgba(0,0,0,0.08)">
    <div style="background:#db2777;padding:28px 24px;text-align:center">
      <p style="margin:0;color:#fff;font-size:22px;font-weight:bold">GestaGlic</p>
      <p style="margin:8px 0 0;color:#fce7f3;font-size:14px">Premium ativado</p>
    </div>
    <div style="padding:32px 24px">
      <p style="margin:0 0 16px;color:#374151;font-size:16px;line-height:1.5">
        Oi, ${firstName}! 🎉
      </p>
      <p style="margin:0 0 24px;color:#6b7280;font-size:15px;line-height:1.6">
        Seu pagamento foi confirmado e o <strong>GestaGlic Premium</strong> já está ativo na sua conta.
        Agora você pode exportar <strong>PDFs ilimitados</strong> do seu relatório de glicemia.
      </p>
      <a href="${reportUrl}"
         style="display:block;text-align:center;background:#db2777;color:#fff;text-decoration:none;padding:14px 24px;border-radius:12px;font-weight:bold;font-size:16px">
        Abrir meu relatório
      </a>
      <p style="margin:24px 0 0;color:#9ca3af;font-size:12px;line-height:1.5">
        Obrigada por apoiar o GestaGlic. Qualquer dúvida, use a página de ajuda no app.
      </p>
    </div>
  </div>
</body>
</html>`;
}

module.exports = { premiumPaymentConfirmedHtml };
