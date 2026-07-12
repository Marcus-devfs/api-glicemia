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

function formatBRL(amount) {
  return `R$ ${Number(amount).toFixed(2).replace(".", ",")}`;
}

function buildPushPayload(user, reminder) {
  const firstName = getFirstName(user.name);
  const icon = MEAL_ICONS[reminder.period] ?? "💗";
  const greeting = firstName ? `${firstName}, ` : "";

  return {
    title: "GestaGlic · Hora de medir a glicemia 💗",
    body: `${icon} ${greeting}${reminder.label}`,
    url: "/medicao",
  };
}

function buildPremiumSuccessPayload(user) {
  const firstName = getFirstName(user.name);
  const greeting = firstName ? `${firstName}, ` : "";

  return {
    title: "Premium ativado! 🎉",
    body: `${greeting}seu pagamento foi confirmado. PDFs ilimitados liberados!`,
    url: "/relatorio?premium=success",
  };
}

function buildPaymentPendingPayload(user, { amount, method }) {
  const firstName = getFirstName(user.name);
  const greeting = firstName ? `${firstName}, ` : "";
  const price = formatBRL(amount);

  if (method === "pix") {
    return {
      title: "Pix gerado · GestaGlic",
      body: `${greeting}complete o pagamento de ${price} para liberar PDFs ilimitados.`,
      url: "/relatorio",
    };
  }

  return {
    title: "Finalize seu pagamento",
    body: `${greeting}seu checkout de ${price} está aguardando. Toque para continuar.`,
    url: "/relatorio",
  };
}

function buildCheckoutReminderPayload(user, payment) {
  const firstName = getFirstName(user.name);
  const greeting = firstName ? `${firstName}, ` : "";
  const price = formatBRL(payment.amount);

  if (payment.paymentMethod === "pix") {
    return {
      title: "Seu Pix ainda está pendente",
      body: `${greeting}faltou só confirmar ${price} para liberar PDFs ilimitados no GestaGlic.`,
      url: "/relatorio",
    };
  }

  return {
    title: "Checkout aguardando",
    body: `${greeting}você iniciou o pagamento de ${price} e não finalizou. Quer continuar?`,
    url: "/relatorio",
  };
}

module.exports = {
  buildPushPayload,
  buildPremiumSuccessPayload,
  buildPaymentPendingPayload,
  buildCheckoutReminderPayload,
};
