import type {
  CatalogQueryService,
  CatalogSearchResult,
} from 'src/modules/catalog/application/catalog-query.port';
import type { NormalizedCatalogSearchRequest } from 'src/modules/catalog/application/catalog-search.types';
import { normalizeCatalogSearchRequest } from 'src/modules/catalog/application/normalize-catalog-search-request';
import { CatalogItemRepository } from 'src/services/catalog-item-repository';

// TODO: Move legacy CatalogItemRepository into src/modules/catalog/infrastructure
// after all callers use the Catalog public API.

export class TwentyCatalogQueryAdapter implements CatalogQueryService {
  constructor(private readonly repository = new CatalogItemRepository()) {}

  async search(request: NormalizedCatalogSearchRequest) {
    return (await this.repository.search(request)) as CatalogSearchResult;
  }

  listCategories(activeOnly: boolean) {
    return this.repository.listCategories(activeOnly);
  }
}

export { normalizeCatalogSearchRequest };
