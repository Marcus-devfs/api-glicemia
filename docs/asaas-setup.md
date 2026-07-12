# Pagamento Asaas — GestaGlic Premium

## Fluxo híbrido

| Método | Onde acontece |
|--------|----------------|
| **Pix** | Transparente no app (QR + copia e cola) |
| **Cartão** | Checkout hospedado Asaas (redirect) |

1. Usuária exporta até **5 PDFs gratuitos**
2. Modal oferece **Pix** (checkout transparente no app) ou **Cartão** (abre Asaas)
3. Pix: ao selecionar, abre checkout no app → informa **CPF só nessa hora** → QR Code + polling
4. Cartão: redirect → callback `?premium=success`
5. Premium liberado automaticamente

## Variáveis (Railway)

```env
ASAAS_API_KEY=$aact_hmlg_...   # sandbox
ASAAS_SANDBOX=true             # força API sandbox
ASAAS_WEBHOOK_TOKEN=seu-token
APP_URL=https://app.gestaglic.com.br
```

**Produção:** troque a chave por `$aact_prod_...` e `ASAAS_SANDBOX=false`.

## Webhook (Pix + cartão)

1. Asaas → **Integrações** → **Webhooks**
2. URL: `https://SUA-API.railway.app/payments/webhook/asaas`
3. Eventos: `PAYMENT_RECEIVED`, `PAYMENT_CONFIRMED`, `CHECKOUT_PAID`
4. Token: mesmo valor de `ASAAS_WEBHOOK_TOKEN`

## Testar Pix no sandbox

1. Gere o QR no app (botão **Pagar com Pix**)
2. No painel Asaas sandbox, localize a cobrança e **confirme o pagamento** manualmente
3. Ou use o webhook — o app também faz polling em `/payments/premium-status`

## Endpoints API

| Método | Rota | Descrição |
|--------|------|-----------|
| POST | `/payments/pix` | Checkout Pix (`body: { cpf }` — só no pagamento, não no cadastro) |
| POST | `/payments/card-checkout` | Checkout só cartão |
| GET | `/payments/premium-status` | Status + sync Asaas |
| POST | `/payments/webhook/asaas` | Webhook |

## Preço e limite

`src/config/premium.js` → `FREE_PDF_LIMIT = 5`, `PREMIUM_PRICE = 14.9`

**Importante:** ao mudar o preço, checkouts/cobranças pendentes no Asaas mantêm o valor antigo. A API só reutiliza sessões com o preço atual; senão gera nova cobrança.

## Taxas Asaas no admin

Ao confirmar pagamento (webhook ou polling), a API grava `netAmount` e `feeAmount` a partir do `netValue` retornado pelo Asaas. O dashboard e a página Assinaturas exibem receita **bruta**, **taxas** e **líquida**. Pagamentos antigos são sincronizados automaticamente ao abrir o admin.
