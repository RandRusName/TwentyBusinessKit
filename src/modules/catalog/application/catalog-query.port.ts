import type {
  CatalogSearchRequest,
  CatalogSearchResult,
  NormalizedCatalogSearchRequest,
} from './catalog-search.types';

export type { CatalogSearchRequest, CatalogSearchResult };

export interface CatalogQueryService {
  search(request: NormalizedCatalogSearchRequest): Promise<CatalogSearchResult>;
  listCategories(activeOnly: boolean): Promise<{
    categories: string[];
    pageInfo: { resultCompleteness: 'COMPLETE' | 'PARTIAL' };
  }>;
}
