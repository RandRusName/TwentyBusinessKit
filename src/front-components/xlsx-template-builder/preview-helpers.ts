import type {
  ScalarBindingDraft,
  WorkItemsTableDraft,
} from 'src/front-components/xlsx-template-builder/builder-helpers';
import {
  normalizeXlsxA1Cell,
  parseXlsxA1Cell,
  type XlsxSheetMetadata,
  type XlsxWorkbookMetadata,
} from 'src/modules/documents';

export type CellPickerMode =
  | { kind: 'none' }
  | { kind: 'scalar'; bindingIndex: number }
  | { kind: 'workItemsColumn'; columnIndex: number }
  | { kind: 'workItemsTemplateRow' };

export type SpreadsheetHighlight = {
  kind: 'scalar' | 'table';
  label: string;
  status?: 'valid' | 'warning' | 'error';
};

export const get_column_letter_from_index = (column: number): string => {
  let value = column;
  let result = '';
  while (value > 0) {
    const rem = (value - 1) % 26;
    result = String.fromCharCode(65 + rem) + result;
    value = Math.floor((value - 1) / 26);
  }
  return result;
};

export const sheetHasPreview = (
  sheet: XlsxSheetMetadata | undefined,
): boolean =>
  sheet?.preview !== undefined &&
  typeof sheet.preview.rowLimit === 'number' &&
  typeof sheet.preview.columnLimit === 'number';

export const findSheet = (
  workbook: XlsxWorkbookMetadata | null,
  sheetName: string,
): XlsxSheetMetadata | undefined =>
  workbook?.sheets.find((sheet) => sheet.name === sheetName);

export const resolveSingleCellNamedRange = (
  refersTo: string,
): { sheetName?: string; cell: string } | null => {
  const trimmed = refersTo.trim().replace(/^=/, '');
  const match =
    /^(?:(?:'([^']+)'|([^!]+))!)?(\$?[A-Za-z]+\$?[1-9][0-9]*)$/.exec(trimmed);
  if (match === null) {
    return null;
  }
  const sheetName = match[1] ?? match[2];
  const cell = normalizeXlsxA1Cell(match[3] ?? '');
  if (cell === null) {
    return null;
  }
  return {
    ...(sheetName === undefined ? {} : { sheetName }),
    cell,
  };
};

export const addressInMergedRange = (
  sheet: XlsxSheetMetadata | undefined,
  address: string,
): boolean => {
  if (sheet === undefined) {
    return false;
  }
  const parsed = parseXlsxA1Cell(address);
  if (parsed === null) {
    return false;
  }
  const columnIndex = columnLettersToIndex(parsed.column);
  for (const range of sheet.mergedRanges) {
    const match =
      /^([A-Z]+)(\d+):([A-Z]+)(\d+)$/i.exec(range.replace(/\$/g, '')) ?? null;
    if (match === null) continue;
    const minCol = columnLettersToIndex(match[1].toUpperCase());
    const minRow = Number(match[2]);
    const maxCol = columnLettersToIndex(match[3].toUpperCase());
    const maxRow = Number(match[4]);
    if (
      parsed.row >= minRow &&
      parsed.row <= maxRow &&
      columnIndex >= minCol &&
      columnIndex <= maxCol &&
      !(minRow === maxRow && minCol === maxCol)
    ) {
      return true;
    }
  }
  return false;
};

const columnLettersToIndex = (letters: string): number => {
  let value = 0;
  for (const char of letters.toUpperCase()) {
    value = value * 26 + (char.charCodeAt(0) - 64);
  }
  return value;
};

export const buildMappingHighlights = ({
  sheetName,
  scalarBindings,
  workItems,
  sheet,
}: {
  sheetName: string;
  scalarBindings: ScalarBindingDraft[];
  workItems: WorkItemsTableDraft | null;
  sheet?: XlsxSheetMetadata;
}): {
  highlightedCells: Record<string, SpreadsheetHighlight>;
  warnings: string[];
} => {
  const highlightedCells: Record<string, SpreadsheetHighlight> = {};
  const warnings: string[] = [];
  const used = new Map<string, string>();

  for (const binding of scalarBindings) {
    if (binding.sheetName !== sheetName) continue;
    const cell = normalizeXlsxA1Cell(binding.cell);
    if (cell === null) continue;
    const previous = used.get(cell);
    if (previous !== undefined) {
      warnings.push(`Duplicate target cell: ${sheetName}!${cell}`);
      highlightedCells[cell] = {
        kind: 'scalar',
        label: binding.fieldPath,
        status: 'error',
      };
      continue;
    }
    used.set(cell, binding.fieldPath);
    const status = addressInMergedRange(sheet, cell) ? 'warning' : 'valid';
    if (status === 'warning') {
      warnings.push(`Mapped cell is inside a merged range: ${sheetName}!${cell}`);
    }
    if (
      sheet?.preview !== undefined &&
      (parseXlsxA1Cell(cell)?.row ?? 0) > sheet.preview.rowLimit
    ) {
      warnings.push(`Mapped cell is outside preview range: ${sheetName}!${cell}`);
    }
    highlightedCells[cell] = {
      kind: 'scalar',
      label: binding.fieldPath,
      status,
    };
  }

  if (workItems?.enabled && workItems.sheetName === sheetName) {
    for (const column of workItems.columns.filter((item) => item.enabled)) {
      const cell = normalizeXlsxA1Cell(column.cell);
      if (cell === null) continue;
      const parsed = parseXlsxA1Cell(cell);
      let status: SpreadsheetHighlight['status'] = 'valid';
      if (parsed !== null && parsed.row !== workItems.templateRow) {
        status = 'error';
        warnings.push(
          `Table column cell ${cell} is not on template row ${workItems.templateRow}`,
        );
      }
      if (used.has(cell)) {
        status = 'error';
        warnings.push(`Duplicate target cell: ${sheetName}!${cell}`);
      } else {
        used.set(cell, column.fieldPath);
      }
      if (addressInMergedRange(sheet, cell) && status !== 'error') {
        status = 'warning';
        warnings.push(
          `Mapped cell is inside a merged range: ${sheetName}!${cell}`,
        );
      }
      highlightedCells[cell] = {
        kind: 'table',
        label: `workItems.${column.fieldPath}`,
        status,
      };
    }
  }

  return { highlightedCells, warnings: [...new Set(warnings)] };
};

export const describePickerMode = (mode: CellPickerMode): string | null => {
  if (mode.kind === 'none') return null;
  if (mode.kind === 'scalar') {
    return `Pick a cell for scalar binding #${mode.bindingIndex + 1}`;
  }
  if (mode.kind === 'workItemsTemplateRow') {
    return 'Pick a template row for content.workItems (click a row header)';
  }
  return `Pick a cell for work item column #${mode.columnIndex + 1}`;
};
