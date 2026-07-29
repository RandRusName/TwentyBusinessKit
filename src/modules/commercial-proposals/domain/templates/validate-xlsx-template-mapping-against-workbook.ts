import {
  parseXlsxA1Cell,
  type XlsxTemplateMapping,
  type XlsxTemplateMappingIssue,
  type XlsxWorkbookMetadata,
} from 'src/modules/documents';

export type XlsxTemplateWorkbookValidationMode = 'warn' | 'strict';

export type XlsxTemplateWorkbookValidationIssue = XlsxTemplateMappingIssue & {
  code: string;
};

export type XlsxTemplateWorkbookValidationResult = {
  ok: boolean;
  issues: XlsxTemplateWorkbookValidationIssue[];
  warnings: XlsxTemplateWorkbookValidationIssue[];
};

const VERTICAL_MERGE_REGEX = /^[A-Z]+(\d+):[A-Z]+(\d+)$/i;

const parseTableRefRows = (
  ref: string,
): { startRow: number; endRow: number } | null => {
  const parts = ref.replace(/\$/g, '').split(':');
  if (parts.length !== 2) {
    return null;
  }
  const start = parseXlsxA1Cell(parts[0] ?? '');
  const end = parseXlsxA1Cell(parts[1] ?? '');
  if (start === null || end === null) {
    return null;
  }
  return {
    startRow: Math.min(start.row, end.row),
    endRow: Math.max(start.row, end.row),
  };
};

const collectDuplicateCells = (
  mapping: XlsxTemplateMapping,
): XlsxTemplateWorkbookValidationIssue[] => {
  const issues: XlsxTemplateWorkbookValidationIssue[] = [];
  const seen = new Map<string, string>();

  for (const [index, binding] of mapping.scalarBindings.entries()) {
    const key = `${binding.sheetName}!${binding.cell}`;
    const path = `scalarBindings[${index}].cell`;
    const existing = seen.get(key);
    if (existing !== undefined) {
      issues.push({
        code: 'DUPLICATE_CELL',
        path,
        message: `Cell ${key} is mapped more than once (${existing})`,
      });
    } else {
      seen.set(key, path);
    }
  }

  for (const [index, binding] of mapping.tableBindings.entries()) {
    for (const [columnIndex, column] of binding.columns.entries()) {
      const key = `${binding.sheetName}!${column.cell}`;
      const path = `tableBindings[${index}].columns[${columnIndex}].cell`;
      const existing = seen.get(key);
      if (existing !== undefined) {
        issues.push({
          code: 'DUPLICATE_CELL',
          path,
          message: `Cell ${key} is mapped more than once (${existing})`,
        });
      } else {
        seen.set(key, path);
      }
    }
  }

  return issues;
};

/**
 * Validate mapping against inspected workbook metadata.
 *
 * - warn: UI validate-mapping route (unknown sheets / vertical merges as warnings)
 * - strict: create-version / save (same issues become hard errors)
 */
export const validateXlsxTemplateMappingAgainstWorkbook = ({
  mapping,
  workbook,
  mode,
}: {
  mapping: XlsxTemplateMapping;
  workbook: XlsxWorkbookMetadata | undefined;
  mode: XlsxTemplateWorkbookValidationMode;
}): XlsxTemplateWorkbookValidationResult => {
  const warnings: XlsxTemplateWorkbookValidationIssue[] = [];
  const issues: XlsxTemplateWorkbookValidationIssue[] = [
    ...collectDuplicateCells(mapping),
  ];

  if (workbook === undefined || !Array.isArray(workbook.sheets)) {
    if (mode === 'strict') {
      issues.push({
        code: 'WORKBOOK_REQUIRED',
        path: 'workbook',
        message: 'Workbook metadata is required to save a template version',
      });
    }
    return {
      ok: issues.length === 0,
      issues,
      warnings,
    };
  }

  const sheetByName = new Map(
    workbook.sheets.map((sheet) => [sheet.name, sheet] as const),
  );

  const push = (issue: XlsxTemplateWorkbookValidationIssue) => {
    if (mode === 'strict') {
      issues.push(issue);
    } else {
      warnings.push(issue);
    }
  };

  for (const [index, binding] of mapping.scalarBindings.entries()) {
    const sheet = sheetByName.get(binding.sheetName);
    if (sheet === undefined) {
      push({
        code: 'UNKNOWN_SHEET',
        path: `scalarBindings[${index}].sheetName`,
        message: `Sheet '${binding.sheetName}' was not found in inspected workbook`,
      });
      continue;
    }

    const parsed = parseXlsxA1Cell(binding.cell);
    if (parsed === null) {
      issues.push({
        code: 'INVALID_CELL',
        path: `scalarBindings[${index}].cell`,
        message: `Invalid A1 cell '${binding.cell}'`,
      });
      continue;
    }

    if (parsed.row > sheet.maxRow + 50 || parsed.row < 1) {
      push({
        code: 'CELL_OUTSIDE_BOUNDS',
        path: `scalarBindings[${index}].cell`,
        message: `Cell ${binding.cell} is outside a reasonable range for sheet '${sheet.name}' (maxRow=${sheet.maxRow})`,
      });
    }
  }

  for (const [index, binding] of mapping.tableBindings.entries()) {
    const sheet = sheetByName.get(binding.sheetName);
    if (sheet === undefined) {
      push({
        code: 'UNKNOWN_SHEET',
        path: `tableBindings[${index}].sheetName`,
        message: `Sheet '${binding.sheetName}' was not found in inspected workbook`,
      });
      continue;
    }

    if (binding.templateRow > sheet.maxRow) {
      issues.push({
        code: 'TEMPLATE_ROW_OUT_OF_BOUNDS',
        path: `tableBindings[${index}].templateRow`,
        message: `Template row ${binding.templateRow} exceeds sheet '${sheet.name}' maxRow ${sheet.maxRow}`,
      });
    }

    for (const [columnIndex, column] of binding.columns.entries()) {
      const parsed = parseXlsxA1Cell(column.cell);
      if (parsed === null) {
        issues.push({
          code: 'INVALID_CELL',
          path: `tableBindings[${index}].columns[${columnIndex}].cell`,
          message: `Invalid A1 cell '${column.cell}'`,
        });
        continue;
      }
      if (parsed.row !== binding.templateRow) {
        issues.push({
          code: 'COLUMN_ROW_MISMATCH',
          path: `tableBindings[${index}].columns[${columnIndex}].cell`,
          message: `Table column cell row must equal templateRow (${binding.templateRow})`,
        });
      }
    }

    const templateRowMerges = sheet.mergedRanges.filter((range) => {
      const match = VERTICAL_MERGE_REGEX.exec(range.replace(/\$/g, ''));
      if (match === null) return false;
      const start = Number(match[1]);
      const end = Number(match[2]);
      return (
        start !== end &&
        start <= binding.templateRow &&
        binding.templateRow <= end
      );
    });
    if (templateRowMerges.length > 0) {
      push({
        code: 'VERTICAL_MERGE_ON_TEMPLATE_ROW',
        path: `tableBindings[${index}].templateRow`,
        message:
          'Merged cells spanning multiple rows on the template row are not supported',
      });
    }

    const tables = sheet.tables ?? [];
    for (const table of tables) {
      const rows = parseTableRefRows(table.ref);
      if (rows === null) continue;
      if (
        rows.startRow <= binding.templateRow &&
        binding.templateRow <= rows.endRow
      ) {
        push({
          code: 'EXCEL_TABLE_ON_TEMPLATE_ROW',
          path: `tableBindings[${index}].templateRow`,
          message: `Excel Table '${table.name}' (${table.ref}) overlaps the template row and is not supported`,
        });
      }
    }
  }

  return {
    ok: issues.length === 0,
    issues,
    warnings,
  };
};
