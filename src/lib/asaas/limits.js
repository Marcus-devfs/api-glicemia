const {
  ASAAS_MIN_CHARGE_PRODUCTION,
  ASAAS_MIN_CHARGE_SANDBOX,
} = require("../../config/premium");
const { isSandbox } = require("./client");

function getAsaasMinCharge() {
  return isSandbox() ? ASAAS_MIN_CHARGE_SANDBOX : ASAAS_MIN_CHARGE_PRODUCTION;
}

function validateAsaasChargeAmount(amount) {
  const min = getAsaasMinCharge();
  const value = roundPrice(amount);

  if (!Number.isFinite(value) || value < min) {
    const envLabel = isSandbox() ? "sandbox" : "produção";
    return {
      ok: false,
      min,
      msg: `No Asaas (${envLabel}), o valor mínimo da cobrança é R$ ${min.toFixed(2).replace(".", ",")}. Ajuste o preço premium no admin.`,
    };
  }

  return { ok: true, min };
}

function roundPrice(value) {
  return Math.round(Number(value) * 100) / 100;
}

module.exports = {
  getAsaasMinCharge,
  validateAsaasChargeAmount,
};
