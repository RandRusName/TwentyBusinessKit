# Mikoton CRM Application Architecture

The product is one installable Twenty App implemented as a modular monolith.
Commercial Proposals is a business module, not the product boundary.

## Runtime Boundary

```text
Twenty Core
  -> CRM Application
       -> Foundation
       -> Sales
       -> Catalog
       -> Commercial Proposals
       -> Documents
       -> Administration
  -> external document-service / MinIO / LibreOffice
```

Twenty owns the CRM shell, standard records, permissions and API execution.
The App owns its custom metadata and business rules. External services provide
technical capabilities only.

## Module registry and public APIs

- Registry: `src/modules/registry.ts` (`APP_MODULES` / helpers).
- Public API convention: other code imports only `src/modules/<module>`
  (see each module's `index.ts`).
- New module guide: `docs/architecture/new-module-guide.md`.
- Module docs index: `docs/modules/README.md`.

## Phase 6.0 State

- Existing metadata identifiers and production behavior are unchanged.
- Module contracts, adapters and a registry exist under `src/modules`.
- Foundation owns `ApplicationError`; Sales owns `OpportunityContext`; Catalog
  owns catalog query contracts.
- Compatibility primitives begin under `src/platform` and are re-exported via
  Foundation's public API.
- CI runs `yarn test:architecture` before unit tests.
- Legacy folders (`src/domain`, `src/services`, `src/logic-functions`,
  `src/front-components`, …) remain during incremental migration; no big-bang
  move is permitted. Reusable modules must not import
  `src/domain/commercial-proposal`.

See the context map, module boundaries, dependency rules and migration plan in
this directory.
