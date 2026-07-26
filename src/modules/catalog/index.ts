/**
 * Catalog public API.
 *
 * Stable catalog query/selection contracts and adapters. Other modules and
 * logic functions must import Catalog only through this entrypoint.
 */

export type {
  CatalogQueryService,
  CatalogSearchRequest,
  CatalogSearchResult,
} from './application/catalog-query.port';
export {
  TwentyCatalogQueryAdapter,
  normalizeCatalogSearchRequest,
} from './infrastructure/twenty-catalog-query.adapter';
