import { createHash } from 'node:crypto';

import { ApplicationError } from 'src/modules/foundation';
import {
  CATALOG_ITEM_TYPES,
  type CatalogItemType,
} from 'src/modules/catalog/domain/catalog-item';
import type {
  CatalogSearchRequest,
  NormalizedCatalogSearchRequest,
} from 'src/modules/catalog/application/catalog-search.types';

const isPlainObject = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

const RAW_PAGE_SIZE = 100;
const MAX_AFTER_LENGTH = 512;
const CURSOR_KEYS = new Set(['v', 'after', 'skip', 'filterFingerprint']);

type CatalogSearchCursor = {
  v: 2;
  after: string | null;
  skip: number;
  filterFingerprint: string;
};

const canonicalizeForFingerprint = (value: unknown): unknown => {
  if (Array.isArray(value)) {
    return value.map(canonicalizeForFingerprint);
  }
  if (value !== null && typeof value === 'object') {
    return Object.fromEntries(
      Object.entries(value as Record<string, unknown>)
        .sort(([left], [right]) => left.localeCompare(right))
        .map(([key, entry]) => [key, canonicalizeForFingerprint(entry)]),
    );
  }
  return value;
};

export const buildCatalogFilterFingerprint = (
  request: Pick<
    NormalizedCatalogSearchRequest,
    'text' | 'types' | 'category' | 'currencyCode' | 'activeOnly'
  >,
) =>
  createHash('sha256')
    .update(
      JSON.stringify(
        canonicalizeForFingerprint({
          text: request.text,
          types: [...request.types].sort(),
          category: request.category,
          currencyCode: request.currencyCode,
          activeOnly: request.activeOnly,
        }),
      ),
      'utf8',
    )
    .digest('hex');

const encodeCatalogCursor = (cursor: CatalogSearchCursor) =>
  Buffer.from(JSON.stringify(cursor), 'utf8').toString('base64url');

export const decodeCatalogCursor = (
  value: string,
  request: Pick<
    NormalizedCatalogSearchRequest,
    'text' | 'types' | 'category' | 'currencyCode' | 'activeOnly'
  >,
): CatalogSearchCursor => {
  let parsed: unknown;
  try {
    parsed = JSON.parse(Buffer.from(value, 'base64url').toString('utf8'));
  } catch {
    throw new ApplicationError('INVALID_INPUT', 'cursor is malformed');
  }
  if (!isPlainObject(parsed)) {
    throw new ApplicationError('INVALID_INPUT', 'cursor is malformed');
  }
  const keys = Object.keys(parsed);
  if (
    keys.length !== CURSOR_KEYS.size ||
    keys.some((key) => !CURSOR_KEYS.has(key))
  ) {
    throw new ApplicationError('INVALID_INPUT', 'cursor is malformed');
  }
  if (
    parsed.v !== 2 ||
    (parsed.after !== null && typeof parsed.after !== 'string') ||
    typeof parsed.skip !== 'number' ||
    !Number.isInteger(parsed.skip) ||
    parsed.skip < 0 ||
    parsed.skip > RAW_PAGE_SIZE ||
    typeof parsed.filterFingerprint !== 'string'
  ) {
    throw new ApplicationError('INVALID_INPUT', 'cursor is malformed');
  }
  if (
    typeof parsed.after === 'string' &&
    (parsed.after.length > MAX_AFTER_LENGTH || parsed.after.includes('{'))
  ) {
    throw new ApplicationError('INVALID_INPUT', 'cursor is malformed');
  }
  const expectedFingerprint = buildCatalogFilterFingerprint(request);
  if (parsed.filterFingerprint !== expectedFingerprint) {
    throw new ApplicationError(
      'INVALID_INPUT',
      'cursor does not match current filters',
    );
  }
  return {
    v: 2,
    after: parsed.after,
    skip: parsed.skip,
    filterFingerprint: parsed.filterFingerprint,
  };
};

export const normalizeCatalogSearchRequest = (
  value: unknown,
): NormalizedCatalogSearchRequest => {
  if (value !== undefined && value !== null && !isPlainObject(value)) {
    throw new ApplicationError('INVALID_INPUT', 'Request body must be an object');
  }
  const body = (value ?? {}) as CatalogSearchRequest;
  const types = body.types ?? [];
  if (
    !Array.isArray(types) ||
    types.some((type) => !CATALOG_ITEM_TYPES.includes(type as CatalogItemType))
  ) {
    throw new ApplicationError(
      'INVALID_INPUT',
      'types contains an unsupported catalog item type',
    );
  }
  const currencyCode = body.currencyCode?.trim().toUpperCase() || null;
  if (currencyCode !== null && !/^[A-Z]{3}$/.test(currencyCode)) {
    throw new ApplicationError(
      'INVALID_INPUT',
      'currencyCode must be a three-letter ISO code',
    );
  }
  const limit = body.limit ?? 30;
  const offset = body.offset ?? 0;
  if (!Number.isInteger(limit) || limit < 1 || limit > 100) {
    throw new ApplicationError(
      'INVALID_INPUT',
      'limit must be an integer from 1 to 100',
    );
  }
  if (!Number.isInteger(offset) || offset < 0) {
    throw new ApplicationError(
      'INVALID_INPUT',
      'offset must be a non-negative integer',
    );
  }
  if (
    body.cursor !== undefined &&
    body.cursor !== null &&
    typeof body.cursor !== 'string'
  ) {
    throw new ApplicationError('INVALID_INPUT', 'cursor is malformed');
  }
  const cursor = body.cursor?.trim() || null;
  const normalized: NormalizedCatalogSearchRequest = {
    text: (body.query ?? body.text)?.trim().toLocaleLowerCase('ru-RU') ?? '',
    types: types as CatalogItemType[],
    category: body.category?.trim() || null,
    currencyCode,
    activeOnly: body.activeOnly !== false,
    limit,
    offset,
    cursor,
  };
  if (cursor !== null) {
    decodeCatalogCursor(cursor, normalized);
  }
  return normalized;
};

export { encodeCatalogCursor };
