/**
 * Catalog public API.
 *
 * Stable catalog query/selection contracts and adapters. Other modules and
 * logic functions must import Catalog only through this entrypoint.
 */

export type {
  CatalogItemDto,
  CatalogItemType,
} from './domain/catalog-item';
export { CATALOG_ITEM_TYPES } from './domain/catalog-item';
export type {
  CatalogSearchRequest,
  CatalogSearchResult,
  NormalizedCatalogSearchRequest,
} from './application/catalog-search.types';
export type { CatalogQueryService } from './application/catalog-query.port';
export {
  buildCatalogFilterFingerprint,
  decodeCatalogCursor,
  encodeCatalogCursor,
  normalizeCatalogSearchRequest,
} from './application/normalize-catalog-search-request';
export { TwentyCatalogQueryAdapter } from './infrastructure/twenty-catalog-query.adapter';
