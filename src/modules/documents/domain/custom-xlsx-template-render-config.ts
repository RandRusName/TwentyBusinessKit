import type { XlsxTemplateMapping } from './xlsx-template-mapping';

export type CustomXlsxTemplateFileRef = {
  storageKey: string;
  sha256: string;
  originalFileName: string;
};

/**
 * Optional generation payload extension for user-uploaded XLSX templates.
 * Absent config → built-in mikoton-commercial-proposal template path.
 */
export type CustomXlsxTemplateRenderConfig = {
  templateSource: 'custom-xlsx';
  templateVersionId: string;
  templateFile: CustomXlsxTemplateFileRef;
  mapping: XlsxTemplateMapping;
};

export const CUSTOM_XLSX_TEMPLATE_CODE = 'custom-commercial-proposal-xlsx';
