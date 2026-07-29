export type XlsxNamedRange = {
  name: string;
  refersTo: string;
};

export type XlsxPreviewCell = {
  row: number;
  column: number;
  address: string;
  value: string | number | boolean | null;
  displayValue: string;
  hasFormula: boolean;
  isMerged: boolean;
};

export type XlsxSheetPreview = {
  rowLimit: number;
  columnLimit: number;
  cells: XlsxPreviewCell[];
};

export type XlsxSheetMetadata = {
  name: string;
  maxRow: number;
  maxColumn: number;
  mergedRanges: string[];
  namedRanges: XlsxNamedRange[];
  /** Excel Tables / ListObjects detected on the sheet (if any). */
  tables?: Array<{ name: string; ref: string }>;
  /** Optional bounded cell matrix for lightweight UI preview/cell picker. */
  preview?: XlsxSheetPreview;
};

export type XlsxWorkbookMetadata = {
  sheets: XlsxSheetMetadata[];
};

export const XLSX_PREVIEW_MAX_ROWS = 80;
export const XLSX_PREVIEW_MAX_COLUMNS = 30;
export const XLSX_PREVIEW_MAX_DISPLAY_LENGTH = 120;
