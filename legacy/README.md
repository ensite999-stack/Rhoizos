# Legacy FOSSBilling runtime

The files under `fossbilling/`, `scripts/`, and the PHP portions of `tests/` are retained only as migration/reference material.

The legacy registrar adapter has been removed. The active domain registrar integration lives in the Next.js runtime and uses NameSilo exclusively.

Do not run the legacy payment runtime against the same live payment credentials unless shared idempotency has been explicitly designed.
