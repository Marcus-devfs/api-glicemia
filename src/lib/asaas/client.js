const { PREMIUM_PRICE: DEFAULT_PREMIUM_PRICE } = require("../../config/premium");

/** PNG 1x1 transparente — exigido pelo checkout Asaas em items.imageBase64 */
const PLACEHOLDER_IMAGE_BASE64 =
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==";

function normalizeAsaasApiKey(raw) {
  if (!raw) return "";

  let key = String(raw).trim();

  // Aspas ao colar no Vercel/Railway
  if (
    (key.startsWith('"') && key.endsWith('"')) ||
    (key.startsWith("'") && key.endsWith("'"))
  ) {
    key = key.slice(1, -1).trim();
  }

  // Vercel remove o "$" ao salvar — a chave fica como aact_prod_...
  if (!key.startsWith("$") && /^aact_(prod|hmlg)_/i.test(key)) {
    key = `$${key}`;
  }

  return key;
}

function resolveAsaasApiKey() {
  const b64 = process.env.ASAAS_API_KEY_B64;
  if (b64) {
    try {
      return normalizeAsaasApiKey(Buffer.from(b64.trim(), "base64").toString("utf8"));
    } catch {
      console.warn("[asaas] ASAAS_API_KEY_B64 inválido — usando ASAAS_API_KEY");
    }
  }
  return normalizeAsaasApiKey(process.env.ASAAS_API_KEY);
}

function getKeyEnvironment(apiKey) {
  const key = normalizeAsaasApiKey(apiKey);
  if (key.includes("_prod_") || key.includes("$aact_prod")) return "production";
  if (key.includes("_hmlg_") || key.includes("$aact_hmlg")) return "sandbox";
  return null;
}

function getBaseUrl() {
  const keyEnv = getKeyEnvironment(resolveAsaasApiKey());
  const sandboxFlag = process.env.ASAAS_SANDBOX;

  let useSandbox;

  if (sandboxFlag === "true") useSandbox = true;
  else if (sandboxFlag === "false") useSandbox = false;
  else if (keyEnv === "production") useSandbox = false;
  else if (keyEnv === "sandbox") useSandbox = true;
  else useSandbox = true;

  if (keyEnv === "production" && useSandbox) useSandbox = false;
  if (keyEnv === "sandbox" && !useSandbox) useSandbox = true;

  return useSandbox
    ? "https://api-sandbox.asaas.com/v3"
    : "https://api.asaas.com/v3";
}

function isSandbox() {
  return getBaseUrl().includes("sandbox");
}

function getAsaasConfigDebug() {
  const rawKey = process.env.ASAAS_API_KEY ?? "";
  const usesB64 = Boolean(process.env.ASAAS_API_KEY_B64);
  const apiKey = resolveAsaasApiKey();

  return {
    configured: Boolean(apiKey),
    usesBase64Key: usesB64,
    sandboxFlag: process.env.ASAAS_SANDBOX ?? null,
    baseUrl: getBaseUrl(),
    isSandbox: isSandbox(),
    keyEnv: getKeyEnvironment(apiKey),
    keyLength: apiKey.length,
    keyPrefix: apiKey.slice(0, 12),
    rawHasDollar: String(rawKey).trim().startsWith("$"),
    normalizedHasDollar: apiKey.startsWith("$"),
    autoFixedDollar:
      !usesB64 &&
      Boolean(rawKey) &&
      !String(rawKey).trim().startsWith("$") &&
      apiKey.startsWith("$"),
  };
}

async function asaasRequest(method, path, body) {
  const apiKey = resolveAsaasApiKey();
  if (!apiKey) throw new Error("ASAAS_API_KEY não configurada");

  const baseUrl = getBaseUrl();

  const res = await fetch(`${baseUrl}${path}`, {
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
    const asaasMsg =
      data?.errors?.[0]?.description ||
      data?.message ||
      `Erro Asaas (${res.status})`;
    const asaasCode = data?.errors?.[0]?.code;

    const err = new Error(asaasMsg);
    err.asaas = data;
    err.asaasCode = asaasCode;
    err.asaasDebug = getAsaasConfigDebug();
    throw err;
  }

  return data;
}

/** Testa autenticação sem expor a chave — GET /customers?limit=1 */
async function testAsaasConnection() {
  const debug = getAsaasConfigDebug();
  if (!debug.configured) {
    return { ok: false, debug, error: "ASAAS_API_KEY não configurada" };
  }

  try {
    await asaasRequest("GET", "/customers?limit=1");
    return { ok: true, debug };
  } catch (err) {
    return {
      ok: false,
      debug,
      error: err.message,
      code: err.asaasCode,
    };
  }
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
async function createCardCheckout(userId, appUrl, premiumPrice = DEFAULT_PREMIUM_PRICE) {
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
        value: premiumPrice,
        imageBase64: PLACEHOLDER_IMAGE_BASE64,
      },
    ],
  };

  return asaasRequest("POST", "/checkouts", payload);
}

/** Cobrança Pix transparente */
async function createPixPayment(customerId, userId, premiumPrice = DEFAULT_PREMIUM_PRICE) {
  return asaasRequest("POST", "/payments", {
    customer: customerId,
    billingType: "PIX",
    value: premiumPrice,
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
  resolveAsaasApiKey,
  getKeyEnvironment,
  getAsaasConfigDebug,
  testAsaasConnection,
};
