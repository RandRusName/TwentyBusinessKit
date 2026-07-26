export const CATALOG_ITEM_TYPES = [
  'SERVICE',
  'PRODUCT',
  'LICENSE',
  'PACKAGE',
  'OTHER',
] as const;

export type CatalogItemType = (typeof CATALOG_ITEM_TYPES)[number];

export type CatalogItemDto = {
  id: string;
  name: string;
  itemType: CatalogItemType;
  category: string | null;
  defaultBlock: string;
  description: string | null;
  defaultUnit: string;
  defaultPrice: number;
  currencyCode: string;
  isActive: boolean;
  sortOrder: number;
  isSelectable: boolean;
  validationMessage: string | null;
};
