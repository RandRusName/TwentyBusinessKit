import type { XlsxTemplateMapping } from './xlsx-template-mapping';

export type CustomXlsxTemplateFileRef = {
  storageKey: string;
  sha256: string;
  originalFileName: string;
};

/**
 * Optional generation payload extension for user-uploaded XLSX templates.
 * Absent config → built-in mikoton-commercial-proposal template path.
 *
 * Custom XLSX is a render source/config, not a different business document
 * schema. document-service still returns templateCode=mikoton-commercial-proposal
 * / templateVersion=2; distinguish via result metadata templateSource.
 */
export type CustomXlsxTemplateRenderConfig = {
  templateSource: 'custom-xlsx';
  templateVersionId: string;
  templateFile: CustomXlsxTemplateFileRef;
  mapping: XlsxTemplateMapping;
};

/**
 * @deprecated Misleading: custom XLSX is not a separate document schema code.
 * Prefer templateSource audit fields. Kept only for transitional imports.
 */
export const CUSTOM_XLSX_TEMPLATE_CODE = 'custom-commercial-proposal-xlsx';
