# Application modules

The Mikoton CRM Application is one installable Twenty App implemented as a
modular monolith. Modules are app capabilities, not npm packages.

Registry source of truth: `src/modules/registry.ts`  
Public API convention: import only from `src/modules/<module>`  
New module guide: `docs/architecture/new-module-guide.md`

| Module | Status | Responsibility | Detail |
|---|---|---|---|
| Foundation | supporting | Shared platform primitives (compatibility today; errors/money/dates/logging migrate incrementally) | `src/modules/foundation/README.md` |
| Sales | active | Adapters/contracts for Twenty Company, Person, Opportunity | `src/modules/sales/README.md` |
| Catalog | active | CatalogItem query/selection; defaults copied into proposal snapshots | `src/modules/catalog/README.md` |
| Commercial Proposals | active | First production business module: aggregate, editor, numbering, generation orchestration | [commercial-proposals.md](./commercial-proposals.md) |
| Documents | active | Format-neutral generation port and document-service adapters | `src/modules/documents/README.md` |
| Administration | supporting | Settings design, compatibility defaults, install/migration/health diagnostics | `src/modules/administration/README.md` |

## Future modules

Planned contexts (not implemented):

- **CPQ** — quote configuration beyond the current proposal editor;
- **Company entry point** — start proposals from Company instead of Opportunity;
- **Analytics** — read-oriented reporting across modules;
- **Delivery** — post-acceptance delivery/project tracking (must not turn
  CommercialProposal into a project/invoice/contract tracker).

New modules must follow `docs/architecture/new-module-guide.md` and must not
depend on Commercial Proposals unless they are explicitly part of the proposal
domain.
