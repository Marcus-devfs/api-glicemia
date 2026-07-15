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

function getBabyName(user) {
  return String(user?.pregnancy?.babyName || "").trim();
}

function babyOfArticle(name, sex) {
  if (!name) return "";
  if (sex === "feminino") return `da ${name}`;
  if (sex === "masculino") return `do ${name}`;
  return `de ${name}`;
}

function momOfBaby(user) {
  const name = getBabyName(user);
  if (!name) return null;
  return `mamãe ${babyOfArticle(name, user?.pregnancy?.babySex)}`;
}

/** Saudação curta: nome da mamãe, ou "mamãe da Sofia". */
function greetingPrefix(user) {
  const mom = momOfBaby(user);
  if (mom) return `${mom.charAt(0).toUpperCase()}${mom.slice(1)}, `;
  const firstName = getFirstName(user?.name);
  return firstName ? `${firstName}, ` : "";
}

function babyCareCue(user) {
  const name = getBabyName(user);
  if (!name) return null;
  const sex = user?.pregnancy?.babySex;
  if (sex === "feminino") return `a ${name} agradece o seu cuidado 💗`;
  if (sex === "masculino") return `o ${name} agradece o seu cuidado 💗`;
  return `${name} agradece o seu cuidado 💗`;
}

function buildPushPayload(user, reminder) {
  const icon = MEAL_ICONS[reminder.period] ?? "💗";
  const greeting = greetingPrefix(user);
  const cue = babyCareCue(user);
  const body = cue
    ? `${icon} ${greeting}${reminder.label} — ${cue}`
    : `${icon} ${greeting}${reminder.label}`;

  return {
    title: "GestaGlic · Hora de medir a glicemia 💗",
    body,
    url: "/medicao",
  };
}

function buildPremiumSuccessPayload(user) {
  const greeting = greetingPrefix(user);
  const baby = getBabyName(user);
  const body = baby
    ? `${greeting}seu Kit Consulta está ativo — organizado para você e para ${baby}!`
    : `${greeting}seu pagamento foi confirmado. PDFs ilimitados liberados!`;

  return {
    title: "Premium ativado! 🎉",
    body,
    url: "/relatorio?premium=success",
  };
}

function buildPaymentPendingPayload(user, { amount, method }) {
  const greeting = greetingPrefix(user);
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
  const greeting = greetingPrefix(user);
  const price = formatBRL(payment.amount);
  const baby = getBabyName(user);

  if (payment.paymentMethod === "pix") {
    return {
      title: "Seu Pix ainda está pendente",
      body: baby
        ? `${greeting}faltou só confirmar ${price} para organizar a consulta com carinho por ${baby}.`
        : `${greeting}faltou só confirmar ${price} para liberar PDFs ilimitados no GestaGlic.`,
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
  momOfBaby,
  greetingPrefix,
};
