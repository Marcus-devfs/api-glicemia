const { sendMail } = require("./sendMail");
const { premiumPaymentConfirmedHtml } = require("./templates/premiumPaymentConfirmed");

async function sendPremiumPaymentConfirmedEmail(user) {
  if (!user?.email) return;

  const appUrl = process.env.APP_URL || "https://app.gestaglic.com.br";

  try {
    await sendMail({
      to: user.email,
      subject: "Pagamento confirmado — GestaGlic Premium ativado!",
      html: premiumPaymentConfirmedHtml({ name: user.name, appUrl }),
    });
  } catch (err) {
    console.log("premium payment email error:", err.message);
  }
}

module.exports = { sendPremiumPaymentConfirmedEmail };
