import {
  isValidXlsxA1Cell,
  normalizeXlsxA1Cell,
  parseXlsxA1Cell,
} from './xlsx-a1';

export type XlsxTemplateValueType =
  | 'string'
  | 'number'
  | 'money'
  | 'date'
  | 'integer'
  | 'percent';

export type XlsxCellAddress = {
  sheetName: string;
  cell: string;
};

export type XlsxScalarBinding = {
  kind: 'scalar';
  fieldPath: string;
  sheetName: string;
  cell: string;
  valueType?: XlsxTemplateValueType;
};

export type XlsxTableColumnBinding = {
  fieldPath: string;
  cell: string;
};

export type XlsxTableCollectionPath = 'content.workItems' | 'content.plan';

export type XlsxTableBinding = {
  kind: 'table';
  collectionPath: XlsxTableCollectionPath;
  sheetName: string;
  templateRow: number;
  insertMode: 'insertRowsAndShiftDown';
  minRows: number;
  columns: XlsxTableColumnBinding[];
  copyStyleFromTemplateRow: boolean;
  preserveFormulas: boolean;
};

export type XlsxTemplateMapping = {
  schemaVersion: '1.0';
  scalarBindings: XlsxScalarBinding[];
  tableBindings: XlsxTableBinding[];
};

export type XlsxTemplateMappingIssue = {
  path: string;
  message: string;
};

export type XlsxTemplateMappingStructuralResult =
  | { ok: true; mapping: XlsxTemplateMapping }
  | { ok: false; issues: XlsxTemplateMappingIssue[] };

const isObject = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

const isNonEmptyString = (value: unknown): value is string =>
  typeof value === 'string' && value.trim() !== '';

const VALUE_TYPES = new Set<XlsxTemplateValueType>([
  'string',
  'number',
  'money',
  'date',
  'integer',
  'percent',
]);

const COLLECTION_PATHS = new Set<XlsxTableCollectionPath>([
  'content.workItems',
  'content.plan',
]);

const cellKey = (sheetName: string, cell: string) =>
  `${sheetName}!${normalizeXlsxA1Cell(cell) ?? cell}`;

/**
 * Structural mapping validation (A1 addresses, duplicates, shape).
 * Field-path allowlists are enforced by Commercial Proposals.
 */
export const validateXlsxTemplateMappingStructure = (
  value: unknown,
): XlsxTemplateMappingStructuralResult => {
  const issues: XlsxTemplateMappingIssue[] = [];

  if (!isObject(value)) {
    return {
      ok: false,
      issues: [{ path: '', message: 'mapping must be an object' }],
    };
  }

  if (value.schemaVersion !== '1.0') {
    issues.push({
      path: 'schemaVersion',
      message: "schemaVersion must be '1.0'",
    });
  }

  if (!Array.isArray(value.scalarBindings)) {
    issues.push({
      path: 'scalarBindings',
      message: 'scalarBindings must be an array',
    });
  }

  if (!Array.isArray(value.tableBindings)) {
    issues.push({
      path: 'tableBindings',
      message: 'tableBindings must be an array',
    });
  }

  if (issues.length > 0) {
    return { ok: false, issues };
  }

  const scalarBindings = value.scalarBindings as unknown[];
  const tableBindings = value.tableBindings as unknown[];

  if (scalarBindings.length === 0 && tableBindings.length === 0) {
    issues.push({
      path: '',
      message: 'at least one scalar or table binding is required',
    });
  }

  const usedCells = new Set<string>();
  const normalizedScalars: XlsxScalarBinding[] = [];

  for (const [index, binding] of scalarBindings.entries()) {
    const path = `scalarBindings[${index}]`;
    if (!isObject(binding)) {
      issues.push({ path, message: 'binding must be an object' });
      continue;
    }
    if (binding.kind !== 'scalar') {
      issues.push({ path: `${path}.kind`, message: "kind must be 'scalar'" });
    }
    if (!isNonEmptyString(binding.fieldPath)) {
      issues.push({
        path: `${path}.fieldPath`,
        message: 'fieldPath is required',
      });
    }
    if (!isNonEmptyString(binding.sheetName)) {
      issues.push({
        path: `${path}.sheetName`,
        message: 'sheetName must be a non-empty string',
      });
    }
    if (!isNonEmptyString(binding.cell) || !isValidXlsxA1Cell(binding.cell)) {
      issues.push({
        path: `${path}.cell`,
        message: 'cell must be valid A1 notation',
      });
    }
    if (
      binding.valueType !== undefined &&
      (typeof binding.valueType !== 'string' ||
        !VALUE_TYPES.has(binding.valueType as XlsxTemplateValueType))
    ) {
      issues.push({
        path: `${path}.valueType`,
        message: 'valueType is invalid',
      });
    }

    if (
      isNonEmptyString(binding.sheetName) &&
      isNonEmptyString(binding.cell) &&
      isValidXlsxA1Cell(binding.cell)
    ) {
      const key = cellKey(binding.sheetName.trim(), binding.cell);
      if (usedCells.has(key)) {
        issues.push({
          path: `${path}.cell`,
          message: `duplicate target cell ${key}`,
        });
      } else {
        usedCells.add(key);
      }

      if (isNonEmptyString(binding.fieldPath) && binding.kind === 'scalar') {
        normalizedScalars.push({
          kind: 'scalar',
          fieldPath: binding.fieldPath.trim(),
          sheetName: binding.sheetName.trim(),
          cell: normalizeXlsxA1Cell(binding.cell) as string,
          ...(binding.valueType === undefined
            ? {}
            : { valueType: binding.valueType as XlsxTemplateValueType }),
        });
      }
    }
  }

  const normalizedTables: XlsxTableBinding[] = [];

  for (const [index, binding] of tableBindings.entries()) {
    const path = `tableBindings[${index}]`;
    if (!isObject(binding)) {
      issues.push({ path, message: 'binding must be an object' });
      continue;
    }
    if (binding.kind !== 'table') {
      issues.push({ path: `${path}.kind`, message: "kind must be 'table'" });
    }
    if (
      typeof binding.collectionPath !== 'string' ||
      !COLLECTION_PATHS.has(binding.collectionPath as XlsxTableCollectionPath)
    ) {
      issues.push({
        path: `${path}.collectionPath`,
        message: "collectionPath must be 'content.workItems' or 'content.plan'",
      });
    }
    if (!isNonEmptyString(binding.sheetName)) {
      issues.push({
        path: `${path}.sheetName`,
        message: 'sheetName must be a non-empty string',
      });
    }
    if (
      typeof binding.templateRow !== 'number' ||
      !Number.isInteger(binding.templateRow) ||
      binding.templateRow < 1
    ) {
      issues.push({
        path: `${path}.templateRow`,
        message: 'templateRow must be a positive integer',
      });
    }
    if (binding.insertMode !== 'insertRowsAndShiftDown') {
      issues.push({
        path: `${path}.insertMode`,
        message: "insertMode must be 'insertRowsAndShiftDown'",
      });
    }
    const minRows =
      binding.minRows === undefined ? 1 : (binding.minRows as unknown);
    if (minRows !== 0 && minRows !== 1) {
      issues.push({
        path: `${path}.minRows`,
        message: 'minRows must be 0 or 1',
      });
    }
    if (typeof binding.copyStyleFromTemplateRow !== 'boolean') {
      issues.push({
        path: `${path}.copyStyleFromTemplateRow`,
        message: 'copyStyleFromTemplateRow must be a boolean',
      });
    }
    if (typeof binding.preserveFormulas !== 'boolean') {
      issues.push({
        path: `${path}.preserveFormulas`,
        message: 'preserveFormulas must be a boolean',
      });
    }
    if (!Array.isArray(binding.columns) || binding.columns.length === 0) {
      issues.push({
        path: `${path}.columns`,
        message: 'columns must be a non-empty array',
      });
      continue;
    }

    const tableCellKeys = new Set<string>();
    const normalizedColumns: XlsxTableColumnBinding[] = [];

    for (const [columnIndex, column] of binding.columns.entries()) {
      const columnPath = `${path}.columns[${columnIndex}]`;
      if (!isObject(column)) {
        issues.push({ path: columnPath, message: 'column must be an object' });
        continue;
      }
      if (!isNonEmptyString(column.fieldPath)) {
        issues.push({
          path: `${columnPath}.fieldPath`,
          message: 'fieldPath is required',
        });
      }
      if (!isNonEmptyString(column.cell) || !isValidXlsxA1Cell(column.cell)) {
        issues.push({
          path: `${columnPath}.cell`,
          message: 'cell must be valid A1 notation',
        });
        continue;
      }

      const parsed = parseXlsxA1Cell(column.cell);
      if (
        parsed !== null &&
        typeof binding.templateRow === 'number' &&
        parsed.row !== binding.templateRow
      ) {
        issues.push({
          path: `${columnPath}.cell`,
          message: `column cell row must equal templateRow (${binding.templateRow})`,
        });
      }

      const normalizedCell = normalizeXlsxA1Cell(column.cell) as string;
      if (tableCellKeys.has(normalizedCell)) {
        issues.push({
          path: `${columnPath}.cell`,
          message: `duplicate table column cell ${normalizedCell}`,
        });
      } else {
        tableCellKeys.add(normalizedCell);
      }

      if (isNonEmptyString(column.fieldPath)) {
        normalizedColumns.push({
          fieldPath: column.fieldPath.trim(),
          cell: normalizedCell,
        });
      }
    }

    if (
      binding.kind === 'table' &&
      typeof binding.collectionPath === 'string' &&
      COLLECTION_PATHS.has(binding.collectionPath as XlsxTableCollectionPath) &&
      isNonEmptyString(binding.sheetName) &&
      typeof binding.templateRow === 'number' &&
      Number.isInteger(binding.templateRow) &&
      binding.templateRow >= 1 &&
      binding.insertMode === 'insertRowsAndShiftDown' &&
      (minRows === 0 || minRows === 1) &&
      typeof binding.copyStyleFromTemplateRow === 'boolean' &&
      typeof binding.preserveFormulas === 'boolean' &&
      normalizedColumns.length > 0
    ) {
      normalizedTables.push({
        kind: 'table',
        collectionPath: binding.collectionPath as XlsxTableCollectionPath,
        sheetName: binding.sheetName.trim(),
        templateRow: binding.templateRow,
        insertMode: 'insertRowsAndShiftDown',
        minRows: minRows as 0 | 1,
        columns: normalizedColumns,
        copyStyleFromTemplateRow: binding.copyStyleFromTemplateRow,
        preserveFormulas: binding.preserveFormulas,
      });
    }
  }

  if (issues.length > 0) {
    return { ok: false, issues };
  }

  return {
    ok: true,
    mapping: {
      schemaVersion: '1.0',
      scalarBindings: normalizedScalars,
      tableBindings: normalizedTables,
    },
  };
};
