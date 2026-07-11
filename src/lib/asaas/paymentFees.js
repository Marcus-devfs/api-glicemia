const { getPayment } = require("./client");

function extractFeesFromAsaasPayment(remote) {
  const amount = Number(remote?.value) || 0;
  const netAmount =
    remote?.netValue != null && remote.netValue !== ""
      ? Number(remote.netValue)
      : null;
  const feeAmount =
    netAmount != null && amount > 0
      ? Math.round((amount - netAmount) * 100) / 100
      : null;

  return { amount, netAmount, feeAmount };
}

async function fetchPaymentFees(asaasPaymentId) {
  const remote = await getPayment(asaasPaymentId);
  return extractFeesFromAsaasPayment(remote);
}

module.exports = { extractFeesFromAsaasPayment, fetchPaymentFees };
