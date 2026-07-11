const { Resend } = require('resend')

function getFromEmail() {
  return process.env.EMAIL_FROM || 'noreply@gestaglic.com.br'
}

function getFromAddress() {
  return `GestaGlic <${getFromEmail()}>`
}

async function sendMail({ to, subject, html }) {
  const apiKey = process.env.RESEND_API_KEY
  if (!apiKey) {
    console.error('[email] RESEND_API_KEY não configurada')
    throw new Error('Email service not configured')
  }

  const resend = new Resend(apiKey)

  const { error } = await resend.emails.send({
    from: getFromAddress(),
    to: [to],
    subject,
    html,
  })

  if (error) {
    console.error('[email] Resend error:', error)
    throw new Error(error.message || 'Failed to send email')
  }
}

module.exports = { sendMail, getFromEmail }
