# Module Boundaries

## Foundation

Owns errors, identifiers, money/date/pagination conventions, logging,
localization and compatibility. It imports no business module. Public API:
`src/modules/foundation`.

## Sales

Adapts Twenty Company, Person and Opportunity. It does not duplicate those
objects and does not know proposal lifecycle. Public API: `src/modules/sales`.

## Catalog

Owns CatalogItem lifecycle, validation and query/selection contracts. Catalog
items provide defaults; saved proposal lines remain snapshots. Public API:
`src/modules/catalog`.

## Commercial Proposals

Owns proposal aggregate, items, stages, numbering, editor, readiness,
generation command and generated-file association. It may depend on Foundation,
Sales, Catalog and Documents through their public APIs only. Public API:
`src/modules/commercial-proposals`. Product detail:
`docs/modules/commercial-proposals.md`.

## Documents

Owns format-neutral generation request/result contracts and technical adapters.
MinIO, LibreOffice, signed URLs and worker credentials cannot leak into proposal
domain code. Public API: `src/modules/documents`.

## Administration

Owns settings design, compatibility, installation state, migration state and
health diagnostics. It may read the module registry; it must not import
Commercial Proposals internals. No settings metadata object is introduced in
Phase 6.0. Public API: `src/modules/administration`.

## Future Contexts

Analytics is read-oriented. Delivery begins after an accepted proposal. Neither
may turn CommercialProposal into a project, invoice, contract or task tracker.
See `docs/architecture/new-module-guide.md`.
