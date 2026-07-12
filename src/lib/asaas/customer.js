const { asaasRequest } = require("./client");
const { sanitizeCpfCnpj } = require("./cpf");

function formatPhone(phone) {
  if (!phone) return undefined;
  const digits = phone.replace(/\D/g, "");
  return digits.length >= 10 ? digits : undefined;
}

async function disableCustomerNotifications(customerId) {
  if (!customerId) return;
  try {
    await asaasRequest("PUT", `/customers/${customerId}`, {
      notificationDisabled: true,
    });
  } catch (err) {
    console.log("asaas disable notifications:", customerId, err.message);
  }
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
        notificationDisabled: true,
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

  await disableCustomerNotifications(customerId);

  const cpfCnpj = cpfFromRequest || (await getCustomerCpf(customerId));

  return { customerId, cpfCnpj };
}

async function disableNotificationsForAllCustomers() {
  const limit = 100;
  let offset = 0;
  let updated = 0;
  let skipped = 0;
  let errors = 0;

  while (true) {
    const list = await asaasRequest(
      "GET",
      `/customers?offset=${offset}&limit=${limit}`
    );
    const data = list.data || [];
    if (!data.length) break;

    for (const customer of data) {
      if (customer.notificationDisabled) {
        skipped++;
        continue;
      }

      try {
        await asaasRequest("PUT", `/customers/${customer.id}`, {
          notificationDisabled: true,
        });
        updated++;
      } catch (err) {
        errors++;
        console.log("asaas bulk disable:", customer.id, err.message);
      }
    }

    if (data.length < limit) break;
    offset += limit;
  }

  return { updated, skipped, errors };
}

module.exports = {
  getOrCreateCustomer,
  syncCustomerCpf,
  disableCustomerNotifications,
  disableNotificationsForAllCustomers,
};
