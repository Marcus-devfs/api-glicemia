const { asaasRequest } = require("./client");
const { sanitizeCpfCnpj } = require("./cpf");

function formatPhone(phone) {
  if (!phone) return undefined;
  const digits = phone.replace(/\D/g, "");
  return digits.length >= 10 ? digits : undefined;
}

async function syncCustomerCpf(customerId, cpfCnpj) {
  if (!cpfCnpj) return;
  await asaasRequest("PUT", `/customers/${customerId}`, { cpfCnpj });
}

async function getCustomerCpf(customerId) {
  const customer = await asaasRequest("GET", `/customers/${customerId}`);
  return sanitizeCpfCnpj(customer.cpfCnpj);
}

async function getOrCreateCustomer(user, cpfInput) {
  const cpfFromRequest = sanitizeCpfCnpj(cpfInput);

  let customerId = user.asaasCustomerId;

  if (!customerId) {
    const list = await asaasRequest(
      "GET",
      `/customers?email=${encodeURIComponent(user.email)}&limit=1`
    );

    const existing = list.data?.[0];
    if (existing?.id) {
      customerId = existing.id;
    } else {
      const phone = formatPhone(user.telephone);
      const created = await asaasRequest("POST", "/customers", {
        name: user.name,
        email: user.email,
        externalReference: user._id.toString(),
        ...(phone && { mobilePhone: phone }),
        ...(cpfFromRequest && { cpfCnpj: cpfFromRequest }),
      });
      customerId = created.id;
    }

    user.asaasCustomerId = customerId;
    await user.save();
  }

  if (cpfFromRequest) {
    await syncCustomerCpf(customerId, cpfFromRequest);
  }

  const cpfCnpj = cpfFromRequest || (await getCustomerCpf(customerId));

  return { customerId, cpfCnpj };
}

module.exports = { getOrCreateCustomer, syncCustomerCpf };
