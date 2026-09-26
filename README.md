# Rhoizos

**你的域名，你的世界。**  
**Your domain. Your world.**

Rhoizos is a focused domain registrar storefront: search, register, transfer, renew, RDAP, DNS, and private per-record notes.

## Current architecture

The primary application is now **Netlify + Next.js**.

```text
Browser
  |
  v
Next.js on Netlify
  |-- storefront + account UI
  |-- API Routes / Server Functions
  |-- NOWPayments IPN webhook
  |-- hourly reconciliation cron
  |
  |------> Postgres (Neon / Supabase compatible)
  |------> Registrar API
  |------> NOWPayments API
```

A traditional VPS is not required for the new runtime. Persistent state lives in Postgres and server-side work runs in Netlify Functions.

The previous FOSSBilling 0.7.2 implementation is retained only as a limited migration/reference layer. Registrar access is server-side and is not exposed as storefront branding.

## Product scope

- Domain availability and retail pricing.
- Register -> verified payment -> registrar registration.
- Transfer in with EPP/Auth Code -> payment -> async registrar transfer.
- Transfer out with lock/unlock and Auth Code retrieval.
- Renewal with a normal-renewal eligibility check before checkout.
- Public RDAP lookup.
- DNS add/delete and private per-record notes.
- Domain forwarding with explicit nameserver-impact acknowledgement.
- Free email forwarding management.
- Domain backorder/drop-catch requests; unsuccessful attempts are not billed, and caught domains are invoiced before delivery.
- Required registrar contact details and account/session handling.

There is no hosting, paid mailbox bundle, site builder, general invoice dashboard, or unrelated upsell layer. Email forwarding is the registrar-provided forwarding service, not a hosted mailbox.

## Safety model

- Browser amounts and browser payment state are never trusted.
- NOWPayments IPN signatures are HMAC-SHA512 verified.
- After a valid IPN, payment status is fetched again from NOWPayments before settlement.
- Payment settlement is idempotent at the order level.
- Charge-producing registrar operations claim an operation row before the provider request.
- Ambiguous provider timeouts are not blindly retried.
- Transfer/Auth Codes are AES-256-GCM encrypted at rest using `RHOIZOS_DATA_KEY`.
- Auth Code reveal and transfer lock changes require a recent login session.
- Private DNS notes stay in Rhoizos Postgres and are never sent to the registrar.
- Premium domains do not auto-purchase.
- Non-normal expiry/redemption renewal paths stop and require support handling.

## Local development

```sh
cp .env.example .env.local
npm install
npm run dev
```

Initialize Postgres once:

```sh
psql "$DATABASE_URL" -f db/schema.sql
```

Build verification:

```sh
npm run check
```

The legacy PHP validation remains in GitHub Actions during migration.

## Netlify deployment

1. Use the existing Netlify project `rhoizos-preview`.
2. Connect the GitHub repository `ensite999-stack/Rhoizos` to that Netlify project.
3. Framework detection should resolve to Next.js. The build command is defined in `netlify.toml`.
4. The hourly reconciliation worker is `netlify/functions/reconcile.mts`; `netlify/functions/dropcatch.mts` checks the backorder processing window every five minutes.
5. Configure the required environment variables from `.env.example`.
6. Keep `RHOIZOS_LIVE_PAYMENTS=0`, `RHOIZOS_LIVE_REGISTRATION=0`, and `RHOIZOS_LIVE_DROPCATCH=0` during acceptance testing.
7. Verify `/api/health` after deployment.
8. Test account isolation, domain search, payment callbacks, reconciliation, registration, transfer, renewal, transfer-out and DNS before enabling live fences.

## Required environment

See `.env.example`.

Core variables:

- `DATABASE_URL`
- `RHOIZOS_APP_URL`
- `RHOIZOS_DATA_KEY`
- `RHOIZOS_TLD_PRICES_JSON`
- Registrar credentials configured in the deployment environment.
- `NOWPAYMENTS_API_KEY`
- `NOWPAYMENTS_IPN_SECRET`
- `CRON_SECRET`

## Legacy runtime

See `legacy/README.md`.

Do not run the Vercel-native app and the legacy FOSSBilling runtime against the same live payment/registrar credentials unless shared idempotency has been deliberately designed.


## Registrar

Rhoizos keeps registrar integration behind the server-side service layer. Storefront pricing is calculated from current registrar cost, payment-processing fee allowance and a fixed $1 service margin. Premium domains require a live per-domain registrar quote.


### Drop-catching

Drop-catching is separately fenced by `RHOIZOS_LIVE_DROPCATCH`. The scheduled worker only submits pending requests during the supported processing window. When a catch succeeds, Rhoizos creates the customer claim invoice using the fixed pricing policy; local ownership is delivered only after that invoice is paid.
