const { asaasRequest } = require("./client");

function formatPhone(phone) {
  if (!phone) return undefined;
  const digits = phone.replace(/\D/g, "");
  return digits.length >= 10 ? digits : undefined;
}

async function getOrCreateCustomer(user) {
  if (user.asaasCustomerId) return user.asaasCustomerId;

  const list = await asaasRequest(
    "GET",
    `/customers?email=${encodeURIComponent(user.email)}&limit=1`
  );

  const existing = list.data?.[0];
  if (existing?.id) {
    user.asaasCustomerId = existing.id;
    await user.save();
    return existing.id;
  }

  const phone = formatPhone(user.telephone);
  const created = await asaasRequest("POST", "/customers", {
    name: user.name,
    email: user.email,
    externalReference: user._id.toString(),
    ...(phone && { mobilePhone: phone }),
  });

  user.asaasCustomerId = created.id;
  await user.save();
  return created.id;
}

module.exports = { getOrCreateCustomer };
