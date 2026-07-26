# Catalog

Reusable catalog items, selection contracts and query capabilities.

## Status

`active` — owns `CatalogItemDto`, search request/result types and normalize
helpers. Saved proposal lines remain independent snapshots; catalog changes
never rewrite existing proposals.

Legacy repository implementation remains in
`src/services/catalog-item-repository.ts` behind
`TwentyCatalogQueryAdapter` (TODO: move into Catalog infrastructure).

## Public API

Import only from `src/modules/catalog`.
