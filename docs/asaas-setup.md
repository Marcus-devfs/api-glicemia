# Pagamento Asaas — GestaGlic Premium

## Fluxo

1. Usuária exporta até **5 PDFs gratuitos**
2. No 6º, abre modal → **Pagar e liberar PDFs ilimitados**
3. API cria checkout Asaas (`POST /payments/checkout`)
4. Usuária paga via **Pix ou cartão de crédito** na página Asaas
5. Webhook confirma → `is_premium: true` automaticamente
6. Retorno para `/relatorio?premium=success`

## Variáveis (Railway)

```env
ASAAS_API_KEY=$aact_prod_...
ASAAS_WALLET_ID=...
ASAAS_WEBHOOK_TOKEN=um-token-secreto-que-voce-escolhe
APP_URL=https://app.gestaglic.com.br
```

## Webhook no painel Asaas

1. Asaas → **Integrações** → **Webhooks**
2. URL: `https://api.gestaglic.com.br/payments/webhook/asaas`
3. Eventos: `PAYMENT_RECEIVED`, `PAYMENT_CONFIRMED`, `CHECKOUT_PAID`
4. Token de autenticação: mesmo valor de `ASAAS_WEBHOOK_TOKEN`

## Endpoints API

| Método | Rota | Auth |
|--------|------|------|
| POST | `/payments/checkout` | Sim |
| GET | `/payments/premium-status` | Sim |
| POST | `/payments/webhook/asaas` | Token header |

## Preço e limite

- `src/config/premium.js`: `FREE_PDF_LIMIT = 5`, `PREMIUM_PRICE = 9.9`
