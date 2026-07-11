const { PREMIUM_PRICE } = require("../../config/premium");

/** PNG 1x1 transparente — exigido pelo checkout Asaas em items.imageBase64 */
const PLACEHOLDER_IMAGE_BASE64 =
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==";

function getBaseUrl() {
  const key = process.env.ASAAS_API_KEY || "";
  if (key.includes("_prod_") || key.includes("$aact_prod")) {
    return "https://api.asaas.com/v3";
  }
  return "https://api-sandbox.asaas.com/v3";
}

function formatPhone(phone) {
  if (!phone) return undefined;
  const digits = phone.replace(/\D/g, "");
  return digits.length >= 10 ? digits : undefined;
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

function buildCheckoutUrl(checkout) {
  if (checkout.link) return checkout.link;
  const id = checkout.id;
  const isProd = getBaseUrl().includes("api.asaas.com");
  const host = isProd ? "https://www.asaas.com" : "https://sandbox.asaas.com";
  return `${host}/checkoutSession/show/${id}`;
}

async function createPremiumCheckout(user, appUrl) {
  const payload = {
    billingTypes: ["PIX", "CREDIT_CARD"],
    chargeTypes: ["DETACHED"],
    minutesToExpire: 60,
    externalReference: user._id.toString(),
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
    customerData: {
      name: user.name,
      email: user.email,
      ...(formatPhone(user.telephone) && { phone: formatPhone(user.telephone) }),
    },
  };

  return asaasRequest("POST", "/checkouts", payload);
}

module.exports = {
  asaasRequest,
  createPremiumCheckout,
  buildCheckoutUrl,
};
