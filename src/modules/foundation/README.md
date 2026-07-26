# Foundation

Shared platform primitives for the Mikoton CRM Application.

## Status

`supporting` — owns `ApplicationError` / `ApplicationErrorCode`. Compatibility
helpers exist under `src/platform` and are re-exported here. Broader Foundation
concerns (money, dates, pagination, logging, localization) move here
incrementally without changing Twenty metadata ids.

## Public API

Import only from `src/modules/foundation`.
