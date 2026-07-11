# Pagamento Asaas — GestaGlic Premium

## Fluxo híbrido

| Método | Onde acontece |
|--------|----------------|
| **Pix** | Transparente no app (QR + copia e cola) |
| **Cartão** | Checkout hospedado Asaas (redirect) |

1. Usuária exporta até **5 PDFs gratuitos**
2. Modal oferece **Pix** (fica no app) ou **Cartão** (abre Asaas)
3. Pix: QR Code + polling a cada 4s + webhook
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
| POST | `/payments/pix` | Gera QR Pix transparente |
| POST | `/payments/card-checkout` | Checkout só cartão |
| GET | `/payments/premium-status` | Status + sync Asaas |
| POST | `/payments/webhook/asaas` | Webhook |

## Preço e limite

`src/config/premium.js` → `FREE_PDF_LIMIT = 5`, `PREMIUM_PRICE = 9.9`
