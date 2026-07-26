import {
  listXlsxTemplateFields,
  type XlsxTemplateFieldDefinition,
} from 'src/modules/commercial-proposals';
import {
  isValidXlsxA1Cell,
  normalizeXlsxA1Cell,
  parseXlsxA1Cell,
  type XlsxTemplateMapping,
  type XlsxWorkbookMetadata,
} from 'src/modules/documents';

export const XLSX_TEMPLATE_MAX_BYTES = 5 * 1024 * 1024;

export type BuilderStep =
  | 'upload'
  | 'workbook'
  | 'scalars'
  | 'workItems'
  | 'validate';

export type ScalarBindingDraft = {
  id: string;
  fieldPath: string;
  sheetName: string;
  cell: string;
};

export type WorkItemColumnDraft = {
  fieldPath: string;
  cell: string;
  enabled: boolean;
};

export type WorkItemsTableDraft = {
  enabled: boolean;
  sheetName: string;
  templateRow: number;
  minRows: 0 | 1;
  copyStyleFromTemplateRow: boolean;
  preserveFormulas: boolean;
  columns: WorkItemColumnDraft[];
};

export type BuilderClientIssue = {
  path: string;
  message: string;
};

export const DEFAULT_SCALAR_FIELD_PATHS = [
  'proposal.number',
  'proposal.date',
  'customer.companyName',
  'proposal.amount',
] as const;

export const RECOMMENDED_WORK_ITEM_FIELDS = [
  'position',
  'name',
  'quantity',
  'unit',
  'unitPrice',
  'lineAmount',
] as const;

export const REQUIRED_WORK_ITEM_FIELDS = ['name', 'quantity'] as const;

const createId = () =>
  globalThis.crypto?.randomUUID?.() ??
  `local-${Date.now()}-${Math.random().toString(16).slice(2)}`;

export const groupScalarFields = () => {
  const fields = listXlsxTemplateFields().filter(
    (field) => field.scope === 'scalar',
  );
  const groups: Array<{
    category: string;
    fields: XlsxTemplateFieldDefinition[];
  }> = [
    {
      category: 'Proposal',
      fields: fields.filter((field) => field.path.startsWith('proposal.')),
    },
    {
      category: 'Customer',
      fields: fields.filter((field) => field.path.startsWith('customer.')),
    },
    {
      category: 'Contractor',
      fields: fields.filter((field) => field.path.startsWith('contractor.')),
    },
    {
      category: 'Content',
      fields: fields.filter((field) => field.path.startsWith('content.')),
    },
  ];
  return groups.filter((group) => group.fields.length > 0);
};

export const listWorkItemFields = () =>
  listXlsxTemplateFields().filter((field) => field.scope === 'workItems');

export const createDefaultScalarBindings = (
  sheetName: string,
): ScalarBindingDraft[] =>
  DEFAULT_SCALAR_FIELD_PATHS.map((fieldPath) => ({
    id: createId(),
    fieldPath,
    sheetName,
    cell: '',
  }));

export const createDefaultWorkItemsDraft = (
  sheetName: string,
): WorkItemsTableDraft => {
  const fields = listWorkItemFields();
  return {
    enabled: true,
    sheetName,
    templateRow: 15,
    minRows: 1,
    copyStyleFromTemplateRow: true,
    preserveFormulas: true,
    columns: fields.map((field) => ({
      fieldPath: field.path,
      cell: '',
      enabled: (RECOMMENDED_WORK_ITEM_FIELDS as readonly string[]).includes(
        field.path,
      ),
    })),
  };
};

export const validateSelectedXlsxFile = (
  file: File | null,
): BuilderClientIssue | null => {
  if (file === null) {
    return { path: 'file', message: 'Select an .xlsx file' };
  }
  const name = file.name.toLowerCase();
  if (!name.endsWith('.xlsx') || name.endsWith('.xlsm')) {
    return { path: 'file', message: 'Only .xlsx files are supported' };
  }
  if (file.size <= 0) {
    return { path: 'file', message: 'File is empty' };
  }
  if (file.size > XLSX_TEMPLATE_MAX_BYTES) {
    return {
      path: 'file',
      message: `File exceeds ${XLSX_TEMPLATE_MAX_BYTES / (1024 * 1024)} MB limit`,
    };
  }
  return null;
};

export const fileToBase64 = async (file: File): Promise<string> => {
  const buffer = await file.arrayBuffer();
  const bytes = new Uint8Array(buffer);
  let binary = '';
  const chunkSize = 0x8000;
  for (let index = 0; index < bytes.length; index += chunkSize) {
    binary += String.fromCharCode(...bytes.subarray(index, index + chunkSize));
  }
  return btoa(binary);
};

export const validateScalarBindingDrafts = (
  drafts: ScalarBindingDraft[],
): BuilderClientIssue[] => {
  const issues: BuilderClientIssue[] = [];
  const used = new Set<string>();

  for (const [index, draft] of drafts.entries()) {
    if (draft.fieldPath.trim() === '') {
      issues.push({
        path: `scalarBindings[${index}].fieldPath`,
        message: 'Field is required',
      });
    }
    if (draft.sheetName.trim() === '') {
      issues.push({
        path: `scalarBindings[${index}].sheetName`,
        message: 'Sheet is required',
      });
    }
    if (!isValidXlsxA1Cell(draft.cell)) {
      issues.push({
        path: `scalarBindings[${index}].cell`,
        message: 'Cell must be valid A1 notation',
      });
      continue;
    }
    const key = `${draft.sheetName.trim()}!${normalizeXlsxA1Cell(draft.cell)}`;
    if (used.has(key)) {
      issues.push({
        path: `scalarBindings[${index}].cell`,
        message: `Duplicate target cell ${key}`,
      });
    } else {
      used.add(key);
    }
  }

  return issues;
};

export const validateWorkItemsDraft = (
  draft: WorkItemsTableDraft,
): BuilderClientIssue[] => {
  if (!draft.enabled) {
    return [];
  }

  const issues: BuilderClientIssue[] = [];
  if (draft.sheetName.trim() === '') {
    issues.push({ path: 'workItems.sheetName', message: 'Sheet is required' });
  }
  if (!Number.isInteger(draft.templateRow) || draft.templateRow < 1) {
    issues.push({
      path: 'workItems.templateRow',
      message: 'Template row must be a positive integer',
    });
  }

  const enabledColumns = draft.columns.filter((column) => column.enabled);
  if (enabledColumns.length === 0) {
    issues.push({
      path: 'workItems.columns',
      message: 'Enable at least one work item column',
    });
  }

  const enabledPaths = new Set(enabledColumns.map((column) => column.fieldPath));
  for (const required of REQUIRED_WORK_ITEM_FIELDS) {
    if (!enabledPaths.has(required)) {
      issues.push({
        path: 'workItems.columns',
        message: `Work items table must include ${required}`,
      });
    }
  }
  if (!enabledPaths.has('unitPrice') && !enabledPaths.has('lineAmount')) {
    issues.push({
      path: 'workItems.columns',
      message: 'Work items table must include unitPrice or lineAmount',
    });
  }

  const usedCells = new Set<string>();
  for (const [index, column] of enabledColumns.entries()) {
    if (!isValidXlsxA1Cell(column.cell)) {
      issues.push({
        path: `workItems.columns[${index}].cell`,
        message: 'Cell must be valid A1 notation',
      });
      continue;
    }
    const parsed = parseXlsxA1Cell(column.cell);
    if (parsed !== null && parsed.row !== draft.templateRow) {
      issues.push({
        path: `workItems.columns[${index}].cell`,
        message: `Column cells must belong to the selected template row ${draft.templateRow}.`,
      });
    }
    const normalized = normalizeXlsxA1Cell(column.cell) as string;
    if (usedCells.has(normalized)) {
      issues.push({
        path: `workItems.columns[${index}].cell`,
        message: `Duplicate table column cell ${normalized}`,
      });
    } else {
      usedCells.add(normalized);
    }
  }

  return issues;
};

export const buildMappingFromDrafts = ({
  scalarBindings,
  workItems,
}: {
  scalarBindings: ScalarBindingDraft[];
  workItems: WorkItemsTableDraft;
}): XlsxTemplateMapping => {
  const mapping: XlsxTemplateMapping = {
    schemaVersion: '1.0',
    scalarBindings: scalarBindings.map((binding) => ({
      kind: 'scalar',
      fieldPath: binding.fieldPath.trim(),
      sheetName: binding.sheetName.trim(),
      cell: normalizeXlsxA1Cell(binding.cell) ?? binding.cell.trim(),
    })),
    tableBindings: [],
  };

  if (workItems.enabled) {
    mapping.tableBindings.push({
      kind: 'table',
      collectionPath: 'content.workItems',
      sheetName: workItems.sheetName.trim(),
      templateRow: workItems.templateRow,
      insertMode: 'insertRowsAndShiftDown',
      minRows: workItems.minRows,
      copyStyleFromTemplateRow: workItems.copyStyleFromTemplateRow,
      preserveFormulas: workItems.preserveFormulas,
      columns: workItems.columns
        .filter((column) => column.enabled)
        .map((column) => ({
          fieldPath: column.fieldPath,
          cell: normalizeXlsxA1Cell(column.cell) ?? column.cell.trim(),
        })),
    });
  }

  return mapping;
};

export const collectClientMappingIssues = ({
  scalarBindings,
  workItems,
}: {
  scalarBindings: ScalarBindingDraft[];
  workItems: WorkItemsTableDraft;
}): BuilderClientIssue[] => [
  ...validateScalarBindingDrafts(scalarBindings),
  ...validateWorkItemsDraft(workItems),
];

export const workbookSheetNames = (
  workbook: XlsxWorkbookMetadata | null,
): string[] => workbook?.sheets.map((sheet) => sheet.name) ?? [];

export const formatFileSize = (bytes: number): string => {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
};
