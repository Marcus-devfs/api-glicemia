# Configuração de e-mail — Resend + gestaglic.com.br

O projeto usa **[Resend](https://resend.com)** para envio de e-mails transacionais (recuperação de senha, boas-vindas).

| Plano Resend Free | Limite |
|-------------------|--------|
| Grátis            | **3.000 e-mails/mês** |
| Domínio próprio   | Sim    |

---

## 1. Criar conta no Resend

1. Acesse [resend.com](https://resend.com) e crie uma conta (grátis)
2. Confirme seu e-mail

---

## 2. Adicionar domínio gestaglic.com.br

1. Resend → **Domains** → **Add Domain**
2. Informe: `gestaglic.com.br`
3. O Resend exibirá registros DNS — adicione no painel do seu domínio (Registro.br, Cloudflare, etc.):

   | Tipo | Nome / Host              | Valor                    |
   |------|--------------------------|--------------------------|
   | TXT  | @ ou gestaglic.com.br    | (verificação Resend)     |
   | MX   | send ou subdomínio       | (valor Resend)           |
   | TXT  | resend._domainkey        | (DKIM — valor Resend)    |

4. Aguarde status **Verified** (geralmente alguns minutos)

---

## 3. Criar API Key

1. Resend → **API Keys** → **Create API Key**
2. Nome: `gestaglic-api`
3. Permissão: **Sending access** (ou Full access)
4. Copie a chave (`re_...`)

---

## 4. Variáveis de ambiente

No `.env` local e no deploy (Vercel/Railway):

```env
RESEND_API_KEY=re_sua_chave_aqui
EMAIL_FROM=noreply@gestaglic.com.br
APP_URL=https://app.gestaglic.com.br
```

> Só use `EMAIL_FROM` com domínio **já verificado** no Resend.  
> Para testes rápidos, o Resend permite enviar de `onboarding@resend.dev` (só para o e-mail da sua conta).

---

## 5. Deploy

Redeploy da **api-glicemia** após adicionar as variáveis.

---

## Fluxos que usam e-mail

| Fluxo | Endpoint |
|-------|----------|
| Esqueci minha senha | `POST /user/forgot-password` |
| Cadastro (boas-vindas) | `POST /user/create` |

---

## Testar recuperação de senha

1. Abra `app.gestaglic.com.br/recuperar-senha`
2. Informe um e-mail cadastrado
3. Verifique a caixa de entrada
4. Clique no link → defina nova senha

---

## Problemas comuns

| Problema | Solução |
|----------|---------|
| Domínio não verificado | Complete DNS no Resend antes de usar `noreply@gestaglic.com.br` |
| `403` / domain not verified | Use domínio verified ou `onboarding@resend.dev` em dev |
| E-mail no spam | Confirme DKIM/SPF verdes no painel Resend |
| Link expirado | Link vale 1h — solicite novo em /recuperar-senha |
