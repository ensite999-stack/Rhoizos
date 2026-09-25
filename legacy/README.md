# Legacy FOSSBilling runtime

The files under `fossbilling/`, `scripts/`, and the PHP portions of `tests/` are the previous FOSSBilling 0.7.2 implementation.

They are intentionally retained during the Vercel-native migration so the existing Spaceship and NOWPayments behavior remains auditable and recoverable.

Do not run both runtimes against the same live provider credentials unless shared idempotency and ownership state have been explicitly designed.
