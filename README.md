# Rhoizos

**你的域名，你的世界。**  
**Your domain. Your world.**

Rhoizos is a focused domain registrar storefront: search, register, transfer, renew, RDAP, DNS, and private per-record notes.

## Current architecture

The primary application is now **Vercel-native**.

```text
Browser
  |
  v
Next.js on Vercel
  |-- storefront + account UI
  |-- API Routes / Server Functions
  |-- NOWPayments IPN webhook
  |-- hourly reconciliation cron
  |
  |------> Postgres (Neon / Supabase compatible)
  |------> Spaceship API
  |------> NOWPayments API
```

A traditional VPS is not required for the new runtime. Persistent state lives in Postgres and server-side work runs in Vercel Functions.

The previous FOSSBilling 0.7.2 implementation is intentionally retained in `fossbilling/`, `scripts/`, and the PHP tests during migration. It is a rollback/reference implementation, not the primary runtime.

## Product scope

- Domain availability and retail pricing.
- Register -> NOWPayments -> verified payment -> Spaceship registration.
- Transfer in with EPP/Auth Code -> payment -> async registrar transfer.
- Transfer out with lock/unlock and Auth Code retrieval.
- Renewal with a normal-renewal eligibility check before checkout.
- Public RDAP lookup.
- DNS add/delete and private per-record notes.
- Required registrar contact details and account/session handling.

There is no hosting, email bundle, site builder, general invoice dashboard, or unrelated upsell layer.

## Safety model

- Browser amounts and browser payment state are never trusted.
- NOWPayments IPN signatures are HMAC-SHA512 verified.
- After a valid IPN, payment status is fetched again from NOWPayments before settlement.
- Payment settlement is idempotent at the order level.
- Charge-producing registrar operations claim an operation row before the provider request.
- Ambiguous provider timeouts are not blindly retried.
- Transfer/Auth Codes are AES-256-GCM encrypted at rest using `RHOIZOS_DATA_KEY`.
- Auth Code reveal and transfer lock changes require a recent login session.
- Private DNS notes stay in Rhoizos Postgres and are never sent to Spaceship DNS.
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

## Vercel deployment

1. Create a Postgres database using Neon or Supabase.
2. Run `db/schema.sql`.
3. Import this GitHub repository into Vercel.
4. Configure every required environment variable from `.env.example`.
5. Generate `RHOIZOS_DATA_KEY` as 32 random bytes encoded in base64.
6. Configure `CRON_SECRET`.
7. Point NOWPayments IPN to:
   `/api/payments/nowpayments/webhook`
8. Keep:
   `RHOIZOS_LIVE_PAYMENTS=0`
   and
   `RHOIZOS_LIVE_REGISTRATION=0`
   during controlled acceptance testing.
9. Verify account isolation, domain search/pricing, payment callbacks, reconciliation, registration, transfer, renewal, transfer-out and DNS.
10. Enable live fences only after acceptance succeeds.

## Required environment

See `.env.example`.

Core variables:

- `DATABASE_URL`
- `RHOIZOS_APP_URL`
- `RHOIZOS_DATA_KEY`
- `RHOIZOS_TLD_PRICES_JSON`
- `SPACESHIP_API_KEY`
- `SPACESHIP_API_SECRET`
- `NOWPAYMENTS_API_KEY`
- `NOWPAYMENTS_IPN_SECRET`
- `CRON_SECRET`

## Legacy runtime

See `legacy/README.md`.

Do not run the Vercel-native app and the legacy FOSSBilling runtime against the same live payment/registrar credentials unless shared idempotency has been deliberately designed.
