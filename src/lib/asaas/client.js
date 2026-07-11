const { PREMIUM_PRICE } = require("../../config/premium");

/** PNG 1x1 transparente — exigido pelo checkout Asaas em items.imageBase64 */
const PLACEHOLDER_IMAGE_BASE64 =
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==";

function getBaseUrl() {
  if (process.env.ASAAS_SANDBOX === "true") {
    return "https://api-sandbox.asaas.com/v3";
  }
  if (process.env.ASAAS_SANDBOX === "false") {
    return "https://api.asaas.com/v3";
  }
  const key = process.env.ASAAS_API_KEY || "";
  if (key.includes("_prod_") || key.includes("$aact_prod")) {
    return "https://api.asaas.com/v3";
  }
  return "https://api-sandbox.asaas.com/v3";
}

function isSandbox() {
  return getBaseUrl().includes("sandbox");
}

async function asaasRequest(method, path, body) {
  const apiKey = process.env.ASAAS_API_KEY;
  if (!apiKey) throw new Error("ASAAS_API_KEY não configurada");

  const res = await fetch(`${getBaseUrl()}${path}`, {
    method,
    headers: {
      "Content-Type": "application/json",
      access_token: apiKey,
      "User-Agent": "GestaGlic/1.0",
    },
    body: body ? JSON.stringify(body) : undefined,
  });

  const data = await res.json().catch(() => ({}));

  if (!res.ok) {
    const msg =
      data?.errors?.[0]?.description ||
      data?.message ||
      `Erro Asaas (${res.status})`;
    const err = new Error(msg);
    err.asaas = data;
    throw err;
  }

  return data;
}

function dueDatePlusDays(days = 1) {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return d.toISOString().split("T")[0];
}

function buildCheckoutUrl(checkout) {
  if (checkout.link) return checkout.link;
  const host = isSandbox()
    ? "https://sandbox.asaas.com"
    : "https://www.asaas.com";
  return `${host}/checkoutSession/show/${checkout.id}`;
}

/** Checkout hospedado — somente cartão de crédito */
async function createCardCheckout(userId, appUrl) {
  const payload = {
    billingTypes: ["CREDIT_CARD"],
    chargeTypes: ["DETACHED"],
    minutesToExpire: 60,
    externalReference: userId.toString(),
    callback: {
      successUrl: `${appUrl}/relatorio?premium=success`,
      cancelUrl: `${appUrl}/relatorio?premium=cancel`,
      expiredUrl: `${appUrl}/relatorio?premium=expired`,
    },
    items: [
      {
        name: "GestaGlic Premium",
        description: "PDFs ilimitados na gestacao",
        quantity: 1,
        value: PREMIUM_PRICE,
        imageBase64: PLACEHOLDER_IMAGE_BASE64,
      },
    ],
  };

  return asaasRequest("POST", "/checkouts", payload);
}

/** Cobrança Pix transparente */
async function createPixPayment(customerId, userId) {
  return asaasRequest("POST", "/payments", {
    customer: customerId,
    billingType: "PIX",
    value: PREMIUM_PRICE,
    dueDate: dueDatePlusDays(1),
    externalReference: userId.toString(),
    description: "GestaGlic Premium - PDFs ilimitados",
  });
}

async function getPixQrCode(paymentId) {
  return asaasRequest("GET", `/payments/${paymentId}/pixQrCode`);
}

async function getPayment(paymentId) {
  return asaasRequest("GET", `/payments/${paymentId}`);
}

const PAID_STATUSES = new Set(["RECEIVED", "CONFIRMED", "RECEIVED_IN_CASH"]);

function isPaymentPaid(status) {
  return PAID_STATUSES.has(status);
}

module.exports = {
  asaasRequest,
  createCardCheckout,
  createPixPayment,
  getPixQrCode,
  getPayment,
  buildCheckoutUrl,
  isPaymentPaid,
  isSandbox,
  getBaseUrl,
};
