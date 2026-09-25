# Rhoizos

Domain-only FOSSBilling storefront with Spaceship provisioning and NOWPayments checkout. Blue-black interface, `#702693` accent, cool gray footer, three-part Console Index and private DNS labels.

**Status: implementation for staging review, not a live registrar deployment.** No API credentials, production server or actual NOWPayments configuration were accessible in this workspace. Real payments, domain purchases, email delivery and FOSSBilling end-to-end execution have not been tested. Live money-moving actions default to disabled. This is an integration overlay, not a bundled FOSSBilling installation.

## Preview

```sh
npm run dev
# http://localhost:3000
npm run check
```

Preview supports navigation, registration form validation, domain input validation, and session-only sample DNS labels/add/delete. It does not fabricate domain availability, create accounts, or accept payments. The sample prices and `example.com` DNS records are explicitly labeled. Live mode is enabled only by the server-rendered Twig page and calls same-origin FOSSBilling APIs with its CSRF token and session cookie.

## Included

- Search / transfer / RDAP, cart, login / signup / logout / password reset.
- Full contact profile, company requirement, EPP-format phone, ISO country selection, postal-code guidance; one upstream contact ID is assigned to registrant/admin/tech/billing.
- Domain inventory, invoices, A / AAAA / CNAME / MX / TXT record creation and removal, private labels, nameservers, EPP retrieval.
- Spaceship availability, contact, registration, transfer, renewal, NS, privacy and transfer-lock APIs. Premium names fail closed until separate pricing exists.
- NOWPayments hosted invoice creation, recursive HMAC-SHA512 IPN validation, payment-status API recheck, invoice/currency/amount binding, underpayment rejection, invoice-level settlement fence and local process lock.
- Persisted async Spaceship operation IDs. HTTP 202 never means registered. Retries poll the original operation instead of purchasing again. Ambiguous requests stop for reconciliation.
- FOSSBilling Twig shell for native invoice and recovery screens; module storefront contains only requested domain features.
- Automated contract/validation fixtures and GitHub Actions PHP lint/tests.

The supplied PNG is retained unchanged at `public/assets/logo-source.png`. The UI now uses `public/assets/rhoizos-mark.svg`, a contour trace derived directly from that source image so the circular brush form and both horizontal strokes scale cleanly without redesigning the mark.

## Integration target

The adapters and module target **FOSSBilling 0.7.2's API / model contract**. FOSSBilling `main` has moved to different entity/API types, so do not install this overlay on a different version without porting and acceptance tests. This version target is for reproducible integration review, not a recommendation to run an older release without checking current security advisories.

Requires PHP 8.3+, curl, intl, mbstring, PDO SQLite, and the normal FOSSBilling database/dependencies. A single application host is assumed for the SQLite operation journal and filesystem settlement locks. Multi-host deployment needs shared transactional persistence and distributed locks before live use.

## Installation

1. Back up the existing FOSSBilling files and database. Prepare an isolated staging instance matching the contract above.
2. Run `bash scripts/install.sh /absolute/path/to/fossbilling`. It refuses to overwrite an existing Rhoizos installation. The installer copies Huraga as a native template fallback, replaces the main shell and sets the homepage template to the console.
3. Enable the **Rhoizos** module (its install hook creates `rhoizos_dns_label`) and select the **rhoizos** client theme. The storefront is also available at `/index.php?_url=/rhoizos`.
4. Create a private directory outside the web root, owned by the PHP-FPM user, mode 0700. Set `RHOIZOS_STATE_DIR` to it. Back up its SQLite journal together with FOSSBilling's database; do not delete it to retry payments.
5. Set environment variables from `.env.example` in PHP-FPM/container configuration. FOSSBilling does not automatically read this repository's `.env.example`. Set the domain product ID and NOWPayments gateway ID, verified support email, and optional PGP **public** key file.
6. In FOSSBilling → Domain registration, configure Spaceship API key/secret, assign supported TLDs, registration/renewal/transfer retail prices and valid default nameservers. The storefront assumes **USD**. Start with `.com`, `.net`, `.org`; registry-specific contact attributes for other TLDs are not implemented.
7. Configure a domain product with automatic activation after payment. Configure required client fields and email verification in FOSSBilling, SMTP, HTTPS, secure session cookies, and its normal cron job. Also enforce required fields server-side in FOSSBilling for alternate/native signup paths.
8. Add **Nowpayments** under payment gateways and enter the existing API key and IPN secret. The adapter supplies FOSSBilling's invoice-specific HTTPS `notify_url` when creating the NOWPayments invoice. No key belongs in JavaScript or Git. Enable the intended USDT networks and XMR in the merchant account; actual currency availability is controlled by NOWPayments, not a hardcoded wallet address.
9. Add a cron every minute, under the same service user/environment:
   `php /path/to/repo/scripts/reconcile.php /path/to/fossbilling`
   The worker resumes only journaled operations. It does not initiate arbitrary new orders.
10. Publish operator identity, jurisdiction, retention periods, support/abuse contact, final AUP/privacy/refund terms and PGP fingerprint. The included policy page is explicitly a baseline requiring these details.
11. Complete the acceptance checklist below, then set `RHOIZOS_LIVE_PAYMENTS=1` and `RHOIZOS_LIVE_REGISTRATION=1` for controlled live acceptance. Keep the site private until acceptance completes.

## Acceptance checklist

- Account registration with all contact fields, email delivery/verification, login, logout and reset; CSRF rejection, alternate signup requirements and reverse-proxy rate limits.
- Real availability against Spaceship with insufficient-balance and unavailable/premium names handled correctly.
- USD invoice creation and exact supported currency/network display in NOWPayments.
- Valid/invalid signatures, repeated and concurrent callback delivery, partial/expired/failed payments, invoice mismatch, provider timeout, and payment reconciliation after a lost callback.
- Successful payment → FOSSBilling ledger → pending operation → registration/transfer/renewal completion → correct order/expiry in the console.
- Two clients cannot view/change one another's DNS, labels, nameservers or EPP codes.
- Add/delete supported DNS types, label persistence, nameserver changes, transfer lock and EPP expiry.
- Desktop/mobile/browser accessibility and native invoice/recovery Twig rendering. Browser screenshots were not captured locally because the browser binary download failed in this environment.

## Operational details and limitations

- `register/transfer/renew` request uncertainty is persisted as `submitting`. Do not retry a charge-producing operation blindly: compare the Spaceship account/operation history first, then repair the journal with the verified operation ID. No automatic refund or retry of an uncertain charge.
- `settlement:*` in `crediting` means the process may have stopped while adding funds. Compare the native ledger with the NOWPayments payment ID before modifying state. A second payment for an already-settled invoice requires operator reconciliation; it is not automatically credited twice.
- A lost IPN needs replay from NOWPayments / reprocessing in FOSSBilling. Native `ipn.php` may return HTTP 200 with a JSON error; monitor transaction errors and do not rely solely on provider HTTP retry behavior.
- The automatic worker must be single-host and have the same credentials/environment as PHP-FPM. Native FOSSBilling activation errors may temporarily appear as `failed_setup` while the upstream operation remains pending; the worker resumes that operation.
- RDAP currently uses fixed official origins for `.com`, `.net`, `.org`. Other extensions return an explicit unsupported message. No unrestricted user URL fetch.
- DNS labels live in FOSSBilling's MySQL table and never reach Spaceship. The separate private SQLite journal stores operation/payment references and settlement state. Back up both. Existing unsupported DNS types are viewable but the five-type editor is deliberately limited.
- DNS selector currently lists up to 100 active orders. Larger portfolios need selector pagination. Domain and invoice list pages are paginated.
- Session-based throttling is included for custom endpoints; enforce per-IP/global limits at the reverse proxy, particularly native login/signup and availability APIs.
- Price data is owned by FOSSBilling. Final invoice totals come from the server. The frontend never sends an authoritative price to the payment gateway.
- Registrar/registry contact data and NOWPayments processing cannot be hidden by a “data firewall.” The UI makes no absolute anonymity or no-logging promise.

## Tests

```sh
npm run check
find fossbilling scripts tests -name '*.php' -print0 | xargs -0 -n1 php -l
php tests/core.php
bash -n scripts/install.sh
```

PHP tests cover required contact fields, input validation, DNS payload allowlisting, private-label identity, signatures/tampering, amount/invoice binding, underpayment, durable duplicate fences and asynchronous registration replay with only one upstream POST. The FOSSBilling test fixtures retain their upstream Apache-2.0 notices. CI does not spend money or contact registrar/payment APIs.

## References

- https://docs.spaceship.dev/
- https://docs.fossbilling.org/extensions-and-development/guides/creating-a-registrar-integration/
- https://docs.fossbilling.org/extensions-and-development/guides/creating-a-payment-gateway/
- https://github.com/FOSSBilling/FOSSBilling/tree/0.7.2
- https://nowpayments.io/api
