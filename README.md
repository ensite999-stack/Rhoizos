# Rhoizos

**你的域名，你的世界。**  
**Your domain. Your world.**

Rhoizos is a focused domain storefront and control surface built around a small set of actions: search, register, pay, transfer in, transfer out, renew, RDAP lookup, and DNS management with private per-record notes.

The interface is intentionally restrained: Scandinavian-inspired light surfaces, large typography, high contrast, generous spacing, and the Rhoizos purple accent `#702693`.

## Status

**Staging implementation, not a production registrar deployment.**

The repository contains the storefront, a FOSSBilling integration overlay, a Spaceship registrar adapter, and a NOWPayments payment adapter. Live money-moving actions remain disabled unless the production environment explicitly enables them.

Real registration, renewal, transfer, payment, email, and DNS operations must be acceptance-tested against the actual production accounts before launch.

## Product scope

Rhoizos v1 keeps only the following customer-facing capabilities:

- Domain search and registration.
- Crypto checkout through NOWPayments.
- Transfer in with EPP/Auth code.
- Transfer out by unlocking the domain and retrieving its EPP/Auth code.
- Renewal through a renewal invoice and the configured crypto payment gateway.
- RDAP lookup.
- DNS record management.
- A private note on each DNS record. Notes are stored in Rhoizos and are never published in DNS.
- Account registration, login, password reset, and the contact details required by the registrar workflow.

There is no hosting bundle, site builder, email product, analytics dashboard, or unrelated upsell layer in the storefront.

## Preview

```sh
npm run dev
# http://localhost:3000

npm run check
```

Preview mode is deliberately non-transactional. It shows example TLD prices, a sample domain portfolio, and sample DNS records. It does **not** claim real availability and does not submit payments, registrations, renewals, transfers, or nameserver changes.

## Architecture

```text
Browser
  |
  v
Rhoizos storefront
  |
  v
FOSSBilling 0.7.2
  |--------------------|
  v                    v
NOWPayments        Spaceship API
payments           domain operations
```

The current overlay targets **FOSSBilling 0.7.2's API/model contract**. Do not install it on another FOSSBilling release without porting and testing the integration.

The production host requires PHP 8.3+, curl, intl, mbstring, PDO SQLite, the normal FOSSBilling database/dependencies, HTTPS, and cron.

## Domain operations

The Spaceship adapter implements availability, registration, transfer in, renewal, nameservers, transfer lock/unlock, EPP retrieval, contact submission, and privacy operations.

Registration, transfer, and renewal are treated as charge-producing asynchronous operations. Their operation IDs are persisted before retry decisions are made so an ambiguous timeout is not blindly replayed.

## Payments

NOWPayments is used as the crypto payment gateway.

Registration and transfer orders flow through cart checkout. Renewal uses FOSSBilling's renewal-invoice flow and then the configured payment gateway. Payment settlement and registrar provisioning are separate states.

API keys and secrets must stay in server-side configuration. Never place them in JavaScript, Git, or a public preview deployment.

## DNS notes

DNS records are stored at the DNS provider. The custom note is separate metadata stored by Rhoizos.

Examples:

```text
A      @      192.0.2.1       Website origin
TXT    @      verify=...       Search verification
CNAME  www    example.com      Public website
```

Changing the note does not alter public DNS.

## Installation outline

1. Prepare an isolated FOSSBilling 0.7.2 staging installation.
2. Back up its files and database.
3. Run:

   ```sh
   bash scripts/install.sh /absolute/path/to/fossbilling
   ```

4. Enable the Rhoizos module and select the Rhoizos client theme.
5. Create a private directory outside the web root and set `RHOIZOS_STATE_DIR`.
6. Configure the Spaceship registrar and supported TLD retail prices.
7. Configure the NOWPayments gateway and the existing API/IPN credentials.
8. Configure SMTP, HTTPS, secure cookies, FOSSBilling cron, and the Rhoizos reconciliation worker.
9. Run acceptance tests.
10. Only after successful controlled testing, enable `RHOIZOS_LIVE_PAYMENTS=1` and `RHOIZOS_LIVE_REGISTRATION=1`.

See `.env.example` for the environment variables used by the overlay.

## Acceptance checks

Before production, verify at minimum:

- Signup, email verification, login, logout, password reset, and CSRF behavior.
- Real domain availability and pricing.
- Registration payment -> payment settlement -> asynchronous registration completion.
- Transfer-in payment -> transfer operation and completion state.
- Renewal invoice -> NOWPayments -> renewal operation -> updated expiry.
- Transfer-out unlock, EPP retrieval, and optional relock.
- Client isolation: one account cannot access another account's domains, DNS, notes, or EPP codes.
- DNS add/delete behavior and private-note persistence.
- Lost/repeated payment callbacks and reconciliation.
- Mobile and desktop rendering.
- Published operator identity, jurisdiction, refund terms, privacy terms, abuse contact, and support information.

## Tests

```sh
npm run check
find fossbilling scripts tests -name '*.php' -print0 | xargs -0 -n1 php -l
php tests/core.php
bash -n scripts/install.sh
```

CI does not spend money or contact the live registrar/payment APIs.

## Important limits

- RDAP currently uses fixed registry origins for `.com`, `.net`, and `.org`.
- Premium-domain pricing is not automatically accepted.
- The DNS editor currently covers A, AAAA, CNAME, TXT, and MX.
- Registrar/registry contact requirements still apply; Rhoizos does not promise anonymous registration.
- NOWPayments and the relevant blockchain network process payment information independently of Rhoizos.
- Multi-host production deployment requires shared transactional state and distributed locking instead of the current single-host local operation journal.

## References

- Spaceship API: https://docs.spaceship.dev/
- FOSSBilling registrar integration: https://docs.fossbilling.org/extensions-and-development/guides/creating-a-registrar-integration/
- FOSSBilling payment gateway integration: https://docs.fossbilling.org/extensions-and-development/guides/creating-a-payment-gateway/
- FOSSBilling 0.7.2 source: https://github.com/FOSSBilling/FOSSBilling/tree/0.7.2
- NOWPayments API: https://nowpayments.io/api
