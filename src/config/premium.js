/** Valores padrão na 1ª execução — depois vêm do MongoDB (admin → Financeiro). */
module.exports = {
  FREE_PDF_LIMIT: 5,
  PREMIUM_PRICE: 14.9,
  /** Asaas produção: cobrança mínima R$ 5,00. Sandbox aceita valores menores. */
  ASAAS_MIN_CHARGE_PRODUCTION: 5,
  ASAAS_MIN_CHARGE_SANDBOX: 0.5,
};
