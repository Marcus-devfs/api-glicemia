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

`ASAAS_WALLET_ID` está no `.env.example` mas **não é usado** pelo código — pode omitir.

---

## Checklist — Asaas em produção

### 1. Conta Asaas (painel **produção**, não sandbox)

1. Acesse [https://www.asaas.com](https://www.asaas.com) (conta real, não sandbox.asaas.com).
2. Complete o cadastro comercial:
   - Dados da empresa ou MEI (CNPJ/CPF)
   - Documentos e conta bancária para **saque** do saldo
3. Confirme que estão habilitados:
   - **Pix** (recebimento)
   - **Cartão de crédito** (checkout)
4. Gere a chave de API de produção:
   - **Integrações** → **API** → copiar chave que começa com `$aact_prod_...`

> Enquanto a conta estiver em análise, cobranças reais podem falhar ou ficar retidas.

### 2. Variáveis no Railway (API)

No serviço **api-glicemia**, configure:

```env
ASAAS_API_KEY=$aact_prod_xxxxxxxx
ASAAS_SANDBOX=false
ASAAS_WEBHOOK_TOKEN=um-token-longo-aleatorio-min-32-chars
APP_URL=https://app.gestaglic.com.br
```

| Variável | Sandbox | Produção |
|----------|---------|----------|
| `ASAAS_API_KEY` | `$aact_hmlg_...` | `$aact_prod_...` |
| `ASAAS_SANDBOX` | `true` | **`false`** |
| `ASAAS_WEBHOOK_TOKEN` | qualquer string | **mesmo token do webhook no painel** |
| `APP_URL` | localhost ou app prod | **`https://app.gestaglic.com.br`** |

**Valor mínimo em produção:** o Asaas exige **R$ 5,00** por cobrança (Pix e cartão). No sandbox dá para testar com valores menores. O admin bloqueia preços abaixo do mínimo do ambiente atual.

**Importante:** não misture chave de produção com `ASAAS_SANDBOX=true`.

### Vercel: o `$` some da chave

Se `ASAAS_API_KEY` aparecer como `aact_prod_...` (sem `$`), use **`ASAAS_API_KEY_B64`**:

```bash
echo -n '$aact_prod_SUA_CHAVE_COMPLETA' | base64
```

Cole o resultado no Vercel como `ASAAS_API_KEY_B64` (Production). Redeploy.

### Diagnosticar conexão Asaas

```bash
curl -H "Authorization: Bearer SEU_CRON_SECRET" \
  https://SUA-API.vercel.app/payments/asaas-diagnostic
```

Esperado: `"ok": true`, `"keyPrefix": "$aact_prod_"`.

Depois de salvar → **Redeploy** do serviço.

### 3. Webhook de **produção** (obrigatório)

No painel Asaas **produção** (Integrações → Webhooks):

| Campo | Valor |
|-------|--------|
| **URL** | `https://SUA-API-PRODUCAO.railway.app/payments/webhook/asaas` |
| **Token de autenticação** | igual a `ASAAS_WEBHOOK_TOKEN` no Railway |
| **Eventos** | `PAYMENT_RECEIVED`, `PAYMENT_CONFIRMED`, `CHECKOUT_PAID` |

A API valida o header `asaas-access-token` enviado pelo Asaas.

**Dica:** use a URL pública do Railway (ou domínio customizado da API, se tiver). Teste no navegador — deve responder JSON, não 404.

O webhook do **sandbox** é separado; em produção crie um webhook novo no painel de produção.

### 4. O que **não** precisa mudar no código

- Preço: `src/config/premium.js` → `PREMIUM_PRICE = 14.9`
- Rotas Pix/cartão/webhook já existem
- CPF só no fluxo Pix (checkout transparente)

### 5. Clientes Asaas no MongoDB

Usuárias que pagaram no **sandbox** podem ter `asaasCustomerId` salvo no User. Em produção o Asaas cria/vincula cliente novo pelo e-mail — em geral funciona sozinho. Se Pix falhar com cliente inválido, no admin ou MongoDB limpe `asaasCustomerId` da usuária e tente de novo.

### 6. Teste pós-deploy (produção)

1. Com conta de teste sua, esgote os 5 PDFs grátis (ou use usuária de teste).
2. **Pix:** gerar QR → pagar de verdade (R$ 14,90) → premium libera (webhook ou botão “Já paguei”).
3. **Cartão:** abrir checkout → valor **R$ 14,90** → pagar → redirect `?premium=success`.
4. Admin → **Financeiro:** conferir pagamento `paid` com bruto/líquido/taxa.

Para validar só o webhook sem gastar: no painel Asaas, abra o webhook e use “Enviar teste” (se disponível) ou faça um Pix mínimo real.

### 7. Dev local vs produção

| Ambiente | Onde |
|----------|------|
| Local (`.env`) | Pode manter sandbox (`ASAAS_SANDBOX=true` + chave hmlg) |
| Railway | Só produção (`ASAAS_SANDBOX=false` + chave prod) |

---

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

O preço **ativo** fica no MongoDB (`AppSettings`) e pode ser alterado em **Admin → Financeiro** sem redeploy.

Valores padrão na 1ª execução: `src/config/premium.js` → `FREE_PDF_LIMIT = 5`, `PREMIUM_PRICE = 14.9`

| Endpoint | Descrição |
|----------|-----------|
| GET | `/settings/premium` | App lê preço e limite (público) |
| GET/PATCH | `/admin/settings/premium` | Admin lê/altera |

**Importante:** ao mudar o preço, checkouts/cobranças pendentes no Asaas mantêm o valor antigo. A API só reutiliza sessões com o preço atual; senão gera nova cobrança.

## Taxas Asaas no admin

Ao confirmar pagamento (webhook ou polling), a API grava `netAmount` e `feeAmount` a partir do `netValue` retornado pelo Asaas. O dashboard e a página Assinaturas exibem receita **bruta**, **taxas** e **líquida**. Pagamentos antigos são sincronizados automaticamente ao abrir o admin.

## Push notifications (premium)

Requer push ativo no app (Perfil → lembretes) e `VAPID_*` configurados.

| Momento | Push |
|---------|------|
| Pagamento confirmado (Pix/cartão) | "Premium ativado! PDFs ilimitados liberados" → `/relatorio` |
| Pix gerado (nova cobrança) | "Complete o pagamento de R$ X" → `/relatorio` |
| Checkout abandonado | 1 lembrete: cartão após **45 min**, Pix após **2 h** |

### Cron no Railway

Além do cron de lembretes de glicemia (`POST /push/reminders` a cada 15 min), configure:

```
POST https://<sua-api>/payments/remind-pending
Authorization: Bearer <CRON_SECRET>
```

Sugestão: **a cada 30 min** ou **1 h**.

Teste local (dev): `POST /payments/remind-pending?force=1` com header Bearer `CRON_SECRET`.

