/**
 * Documents public API.
 *
 * Format-neutral generation contracts and technical adapters. Other modules
 * must import Documents only through this entrypoint.
 */

export type {
  DocumentGenerationPort,
  DocumentGenerationRequest,
} from './domain/document-generation-port';
export { HttpDocumentServiceAdapter } from './infrastructure/http-document-service.adapter';

export {
  isValidXlsxA1Cell,
  normalizeXlsxA1Cell,
  parseXlsxA1Cell,
} from './domain/xlsx-a1';

export type {
  XlsxNamedRange,
  XlsxPreviewCell,
  XlsxSheetMetadata,
  XlsxSheetPreview,
  XlsxWorkbookMetadata,
} from './domain/xlsx-workbook-metadata';
export {
  XLSX_PREVIEW_MAX_COLUMNS,
  XLSX_PREVIEW_MAX_DISPLAY_LENGTH,
  XLSX_PREVIEW_MAX_ROWS,
} from './domain/xlsx-workbook-metadata';

export type {
  XlsxCellAddress,
  XlsxScalarBinding,
  XlsxTableBinding,
  XlsxTableCollectionPath,
  XlsxTableColumnBinding,
  XlsxTemplateMapping,
  XlsxTemplateMappingIssue,
  XlsxTemplateMappingStructuralResult,
  XlsxTemplateValueType,
} from './domain/xlsx-template-mapping';
export { validateXlsxTemplateMappingStructure } from './domain/xlsx-template-mapping';

export type {
  CustomXlsxTemplateFileRef,
  CustomXlsxTemplateRenderConfig,
} from './domain/custom-xlsx-template-render-config';
export { CUSTOM_XLSX_TEMPLATE_CODE } from './domain/custom-xlsx-template-render-config';

export type {
  XlsxTemplateInspectPort,
  XlsxTemplateInspectRequest,
  XlsxTemplateInspectResult,
} from './domain/xlsx-template-inspect-port';
