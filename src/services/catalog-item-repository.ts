import { CoreApiClient } from 'twenty-client-sdk/core';

import { ApplicationError } from 'src/modules/foundation';
import {
  CATALOG_ITEM_TYPES,
  type CatalogItemDto,
  type CatalogItemType,
  type CatalogSearchRequest,
  type NormalizedCatalogSearchRequest,
  buildCatalogFilterFingerprint,
  decodeCatalogCursor,
  encodeCatalogCursor,
  normalizeCatalogSearchRequest,
} from 'src/modules/catalog';

export {
  CATALOG_ITEM_TYPES,
  buildCatalogFilterFingerprint,
  decodeCatalogCursor,
  encodeCatalogCursor,
  normalizeCatalogSearchRequest,
};
export type {
  CatalogItemDto,
  CatalogItemType,
  CatalogSearchRequest,
  NormalizedCatalogSearchRequest,
};

const RAW_PAGE_SIZE = 100;

type NativeCurrencyValue = {
  amountMicros?: number | null;
  currencyCode?: string | null;
};

type CatalogRecord = Omit<CatalogItemDto, 'isSelectable' | 'validationMessage'> & {
  price?: NativeCurrencyValue | null;
};

export type ResolvedCatalogItemPrice = {
  amount: number;
  currencyCode: string;
  source: 'NATIVE' | 'LEGACY';
  valid: boolean;
  validationMessage: string | null;
};

export const resolveCatalogItemPrice = (
  record: {
    price?: NativeCurrencyValue | null;
    defaultPrice?: number | null;
    currencyCode?: string | null;
  },
  allowLegacyFallback = process.env.CATALOG_ALLOW_LEGACY_PRICE_FALLBACK === 'true',
): ResolvedCatalogItemPrice => {
  const amountMicros = record.price?.amountMicros;
  const nativeCurrency = record.price?.currencyCode?.trim().toUpperCase() ?? '';
  if (
    typeof amountMicros === 'number' &&
    Number.isSafeInteger(amountMicros) &&
    amountMicros >= 0 &&
    /^[A-Z]{3}$/.test(nativeCurrency)
  ) {
    return {
      amount: amountMicros / 1_000_000,
      currencyCode: nativeCurrency,
      source: 'NATIVE',
      valid: true,
      validationMessage: null,
    };
  }
  const nativePriceWasProvided = record.price !== undefined && record.price !== null;
  const nativeValidationMessage = nativePriceWasProvided
    ? typeof amountMicros !== 'number' || !Number.isSafeInteger(amountMicros) || amountMicros < 0
      ? 'Некорректная цена'
      : !/^[A-Z]{3}$/.test(nativeCurrency)
        ? 'Некорректная валюта'
        : 'Укажите цену и валюту'
    : 'Укажите цену и валюту';
  const legacyCurrency = record.currencyCode?.trim().toUpperCase() ?? '';
  if (
    allowLegacyFallback &&
    typeof record.defaultPrice === 'number' &&
    Number.isFinite(record.defaultPrice) &&
    record.defaultPrice >= 0 &&
    /^[A-Z]{3}$/.test(legacyCurrency)
  ) {
    return {
      amount: record.defaultPrice,
      currencyCode: legacyCurrency,
      source: 'LEGACY',
      valid: true,
      validationMessage: null,
    };
  }
  return {
    amount: 0,
    currencyCode: nativeCurrency || legacyCurrency,
    source: 'NATIVE',
    valid: false,
    validationMessage: nativeValidationMessage,
  };
};

const getCatalogItemValidationMessage = (record: Partial<CatalogRecord>) => {
  if (typeof record.name !== 'string' || record.name.trim() === '') return 'Не указано название';
  if (
    typeof record.itemType !== 'string' ||
    !(CATALOG_ITEM_TYPES as readonly string[]).includes(record.itemType)
  ) {
    return 'Некорректный тип позиции';
  }
  if (typeof record.defaultBlock !== 'string' || record.defaultBlock.trim() === '') return 'Не указан блок работ';
  if (typeof record.defaultUnit !== 'string' || record.defaultUnit.trim() === '') return 'Не указана единица измерения';
  if (typeof record.defaultPrice !== 'number' || !Number.isFinite(record.defaultPrice) || record.defaultPrice < 0) return 'Некорректная цена';
  if (typeof record.currencyCode !== 'string' || !/^[A-Z]{3}$/.test(record.currencyCode)) return 'Некорректная валюта';
  if (typeof record.sortOrder !== 'number' || !Number.isInteger(record.sortOrder)) return 'Некорректный порядок';
  return null;
};

const mapCatalogItem = (
  record: Partial<CatalogRecord> & { id: string },
  requestedCurrency: string | null,
): CatalogItemDto => {
  const isActive = record.isActive === true;
  const price = resolveCatalogItemPrice(record);
  const currencyCode = price.currencyCode;
  const defaultPrice = price.amount;
  const currencyMatches = requestedCurrency === null || currencyCode === requestedCurrency;
  const rawItemType = typeof record.itemType === 'string' ? record.itemType.trim() : '';
  const itemType = (
    (CATALOG_ITEM_TYPES as readonly string[]).includes(rawItemType)
      ? rawItemType
      : 'OTHER'
  ) as CatalogItemType;
  const validationMessage = price.validationMessage ?? getCatalogItemValidationMessage({
    ...record,
    itemType: rawItemType as CatalogItemType,
    defaultPrice,
    currencyCode,
  });
  return {
    id: record.id,
    name: record.name ?? '',
    itemType,
    category: record.category ?? null,
    defaultBlock: record.defaultBlock ?? 'Работы',
    description: record.description ?? null,
    defaultUnit: record.defaultUnit ?? 'час',
    defaultPrice,
    currencyCode,
    isActive,
    sortOrder: record.sortOrder ?? 100,
    isSelectable: isActive && currencyMatches && validationMessage === null,
    validationMessage: validationMessage ?? (!isActive
      ? 'Позиция неактивна'
      : currencyMatches
        ? null
        : `Позиция доступна только для ${currencyCode}`),
  };
};

const compareCatalogItems = (left: CatalogItemDto, right: CatalogItemDto) =>
  left.sortOrder - right.sortOrder ||
  left.name.localeCompare(right.name, 'ru') ||
  left.id.localeCompare(right.id);

const matchesCatalogFilters = (
  item: CatalogItemDto,
  request: NormalizedCatalogSearchRequest,
) => {
  const textMatches =
    request.text === '' ||
    `${item.name} ${item.description ?? ''} ${item.category ?? ''}`
      .toLocaleLowerCase('ru-RU')
      .includes(request.text);
  return (
    (!request.activeOnly || item.isActive) &&
    (request.types.length === 0 || request.types.includes(item.itemType)) &&
    (request.category === null || item.category === request.category) &&
    (request.currencyCode === null || item.currencyCode === request.currencyCode) &&
    textMatches
  );
};

/** Safety bound only. Hitting it returns PARTIAL, never silent COMPLETE. */
const MAX_RAW_PAGES_PER_REQUEST = 500;

const catalogItemSelection = {
  id: true,
  name: true,
  itemType: true,
  category: true,
  defaultBlock: true,
  description: true,
  defaultUnit: true,
  price: {
    amountMicros: true,
    currencyCode: true,
  },
  defaultPrice: true,
  currencyCode: true,
  isActive: true,
  sortOrder: true,
} as const;

export class CatalogItemRepository {
  constructor(
    private readonly client: InstanceType<typeof CoreApiClient> = new CoreApiClient(),
  ) {}

  async search(request: NormalizedCatalogSearchRequest) {
    try {
      const collected: CatalogItemDto[] = [];
      const pageCategories = new Set<string>();
      const seenIds = new Set<string>();
      const filterFingerprint = buildCatalogFilterFingerprint(request);
      const start = request.cursor === null
        ? { after: null as string | null, skip: 0 }
        : decodeCatalogCursor(request.cursor, request);
      let pageAfter = start.after;
      let skipRemaining = start.skip;
      let upstreamHasNextPage = true;
      let scannedPages = 0;
      let nextAfter: string | null = null;
      let nextSkip = 0;
      let hasMoreFiltered = false;
      let stoppedBySafetyLimit = false;

      while (
        collected.length < request.limit &&
        upstreamHasNextPage &&
        scannedPages < MAX_RAW_PAGES_PER_REQUEST
      ) {
        const response = await (this.client.query as (selection: unknown) => Promise<any>)({
          catalogItems: {
            __args: {
              first: RAW_PAGE_SIZE,
              ...(pageAfter === null ? {} : { after: pageAfter }),
            },
            edges: {
              node: catalogItemSelection,
            },
            pageInfo: { endCursor: true, hasNextPage: true },
          },
        });

        const records: CatalogItemDto[] = (response.catalogItems?.edges ?? [])
          .map((edge: { node?: CatalogRecord | null }) => edge.node)
          .filter((record: CatalogRecord | null | undefined): record is CatalogRecord => record != null)
          .map((record: CatalogRecord) => mapCatalogItem(record, request.currencyCode));

        for (const item of records) {
          if (item.category !== null) pageCategories.add(item.category);
        }

        const filtered = records
          .filter((item: CatalogItemDto) => matchesCatalogFilters(item, request))
          .sort(compareCatalogItems);

        const remainingCapacity = request.limit - collected.length;
        const pageWindow = filtered.slice(skipRemaining);
        const take = pageWindow.slice(0, remainingCapacity);

        for (const item of take) {
          if (seenIds.has(item.id)) continue;
          seenIds.add(item.id);
          collected.push(item);
        }

        const consumedOnPage = skipRemaining + take.length;
        const pageEndCursor =
          typeof response.catalogItems?.pageInfo?.endCursor === 'string'
            ? response.catalogItems.pageInfo.endCursor
            : null;
        upstreamHasNextPage = response.catalogItems?.pageInfo?.hasNextPage === true;
        scannedPages += 1;

        if (collected.length >= request.limit) {
          if (consumedOnPage < filtered.length) {
            nextAfter = pageAfter;
            nextSkip = consumedOnPage;
            hasMoreFiltered = true;
          } else if (upstreamHasNextPage && pageEndCursor !== null) {
            nextAfter = pageEndCursor;
            nextSkip = 0;
            hasMoreFiltered = true;
          } else {
            nextAfter = null;
            nextSkip = 0;
            hasMoreFiltered = false;
          }
          break;
        }

        if (!upstreamHasNextPage || pageEndCursor === null) {
          nextAfter = null;
          nextSkip = 0;
          hasMoreFiltered = false;
          break;
        }

        pageAfter = pageEndCursor;
        skipRemaining = 0;
        nextAfter = pageEndCursor;
        nextSkip = 0;
        hasMoreFiltered = true;
      }

      if (
        collected.length < request.limit &&
        upstreamHasNextPage &&
        scannedPages >= MAX_RAW_PAGES_PER_REQUEST
      ) {
        stoppedBySafetyLimit = true;
        hasMoreFiltered = true;
      }

      return {
        items: collected,
        // Full catalog categories are incomplete when scanning only search pages.
        categories: [] as string[],
        pageCategories: [...pageCategories].sort((a, b) => a.localeCompare(b, 'ru')),
        pageInfo: {
          limit: request.limit,
          endCursor: hasMoreFiltered
            ? encodeCatalogCursor({
                v: 2,
                after: nextAfter,
                skip: nextSkip,
                filterFingerprint,
              })
            : null,
          hasNextPage: hasMoreFiltered,
          resultCompleteness: stoppedBySafetyLimit ? 'PARTIAL' : 'COMPLETE',
        },
      };
    } catch (error) {
      if (error instanceof ApplicationError) throw error;
      throw new ApplicationError(
        'CATALOG_SEARCH_FAILED',
        'Не удалось загрузить каталог работ и услуг',
        error,
      );
    }
  }

  async listCategories(
    activeOnly = true,
    options?: { maxRawPages?: number },
  ) {
    try {
      const maxRawPages = options?.maxRawPages ?? MAX_RAW_PAGES_PER_REQUEST;
      const categories = new Set<string>();
      let pageAfter: string | null = null;
      let upstreamHasNextPage = true;
      let scannedPages = 0;
      let stoppedBySafetyLimit = false;

      while (upstreamHasNextPage && scannedPages < maxRawPages) {
        const response = await (this.client.query as (selection: unknown) => Promise<any>)({
          catalogItems: {
            __args: {
              first: RAW_PAGE_SIZE,
              ...(pageAfter === null ? {} : { after: pageAfter }),
            },
            edges: {
              node: catalogItemSelection,
            },
            pageInfo: { endCursor: true, hasNextPage: true },
          },
        });

        const records: CatalogItemDto[] = (response.catalogItems?.edges ?? [])
          .map((edge: { node?: CatalogRecord | null }) => edge.node)
          .filter((record: CatalogRecord | null | undefined): record is CatalogRecord => record != null)
          .map((record: CatalogRecord) => mapCatalogItem(record, null));

        for (const item of records) {
          if (activeOnly && !item.isActive) continue;
          if (item.category !== null) categories.add(item.category);
        }

        const pageEndCursor =
          typeof response.catalogItems?.pageInfo?.endCursor === 'string'
            ? response.catalogItems.pageInfo.endCursor
            : null;
        upstreamHasNextPage = response.catalogItems?.pageInfo?.hasNextPage === true;
        scannedPages += 1;

        if (!upstreamHasNextPage || pageEndCursor === null) {
          break;
        }

        pageAfter = pageEndCursor;
      }

      if (upstreamHasNextPage && scannedPages >= maxRawPages) {
        stoppedBySafetyLimit = true;
      }

      return {
        categories: [...categories].sort((a, b) => a.localeCompare(b, 'ru')),
        pageInfo: {
          resultCompleteness: stoppedBySafetyLimit ? 'PARTIAL' as const : 'COMPLETE' as const,
        },
      };
    } catch (error) {
      if (error instanceof ApplicationError) throw error;
      throw new ApplicationError(
        'CATALOG_SEARCH_FAILED',
        'Не удалось загрузить категории каталога',
        error,
      );
    }
  }
}
