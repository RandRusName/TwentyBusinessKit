import type { CatalogItemDto, CatalogItemType } from 'src/modules/catalog/domain/catalog-item';

export type CatalogSearchRequest = {
  query?: string;
  text?: string;
  types?: string[];
  category?: string;
  currencyCode?: string;
  activeOnly?: boolean;
  limit?: number;
  offset?: number;
  cursor?: string;
};

export type NormalizedCatalogSearchRequest = {
  text: string;
  types: CatalogItemType[];
  category: string | null;
  currencyCode: string | null;
  activeOnly: boolean;
  limit: number;
  offset: number;
  cursor: string | null;
};

export type CatalogSearchResult = {
  items: CatalogItemDto[];
  categories: string[];
  pageCategories: string[];
  pageInfo: {
    limit: number;
    endCursor: string | null;
    hasNextPage: boolean;
    resultCompleteness: 'COMPLETE' | 'PARTIAL';
  };
};
