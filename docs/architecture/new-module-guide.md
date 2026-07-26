# New module guide

How to add a future module to the Mikoton CRM Application modular monolith.

## Before you start

- One installable Twenty App; modules are app capabilities, not npm packages.
- Do **not** rename `package.json` `name` (`mikoton-commercial-proposals`) or
  change universal / metadata identifiers unless you have an explicit
  migration plan.
- Prefer extending Foundation / Sales / Catalog / Documents / Administration
  before inventing a new module.
- Commercial Proposals is a business module, not the place for shared
  capabilities.

## Suggested structure

```text
src/modules/<module-name>/
  domain/
  application/
  infrastructure/
  presentation/
  index.ts
  README.md
```

| Layer | Rules |
|---|---|
| `domain/` | Pure business rules and types. No React, Twenty SDK, HTTP or `process.env`. |
| `application/` | Use cases and orchestration inside the module. |
| `infrastructure/` | Adapters to Twenty SDK, HTTP, storage, document-service, etc. |
| `presentation/` | Front components and UI adapters owned by this module. |
| `index.ts` | **Stable public API** — the only surface other modules may import. |
| `README.md` | Responsibility, status, public API notes. |

Not every layer is required on day one. Start with `application/` +
`infrastructure/` + `index.ts` when that matches the work.

## Register the module

1. Add the module id to `AppModuleId` / `APP_MODULES` in
   `src/modules/registry.ts`.
2. Declare `dependsOn`, `owns`, `status`, `publicApi`.
3. Add a short entry under `docs/modules/README.md`.
4. Run `yarn test:architecture`.

## Dependency rules

- Foundation imports no business modules.
- Sales, Catalog, Documents and Administration do **not** import Commercial
  Proposals.
- Commercial Proposals may orchestrate Sales / Catalog / Documents through
  **public APIs only**.
- Future modules must not depend on Commercial Proposals unless they are
  explicitly part of the proposal domain.
- Shared capabilities belong in Foundation / Documents / Catalog / Sales /
  Administration (or a new shared module) — not inside Commercial Proposals.
- Cross-module imports must use `src/modules/<module>` (or
  `src/modules/<module>/index`). Deep imports into another module's
  `domain` / `application` / `infrastructure` are forbidden.
- Platform (`src/platform`) cannot import `src/modules/*`.

## Public API convention

```ts
// allowed
import { TwentyCatalogQueryAdapter } from 'src/modules/catalog';

// forbidden from outside catalog
import { TwentyCatalogQueryAdapter } from 'src/modules/catalog/infrastructure/...';
```

Intra-module deep imports (e.g. infrastructure → application) are allowed.

## Checklist

- [ ] `src/modules/<name>/index.ts` exports only stable contracts/adapters
- [ ] Registry entry + docs index updated
- [ ] `yarn test:architecture` green
- [ ] `yarn lint` / `yarn typecheck` / `yarn test:unit` green
- [ ] No new metadata id changes unless intentionally migrated
- [ ] No dependency on Commercial Proposals unless justified

## Examples of future modules

| Candidate | Likely depends on | Must not |
|---|---|---|
| CPQ | foundation, catalog, sales, documents | own proposal numbering |
| Analytics | foundation (+ read models) | write proposal aggregates |
| Delivery | foundation, sales | turn proposals into invoices/projects |
| Company entry | foundation, sales, commercial-proposals (orchestration only via public API) | duplicate Opportunity draft logic carelessly |
