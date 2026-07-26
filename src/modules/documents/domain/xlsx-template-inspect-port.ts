import type { XlsxWorkbookMetadata } from './xlsx-workbook-metadata';

export type XlsxTemplateInspectRequest = {
  templateFileBase64: string;
  originalFileName: string;
};

export type XlsxTemplateInspectResult = {
  status: 'success';
  workbook: XlsxWorkbookMetadata;
  sha256: string;
};

export interface XlsxTemplateInspectPort {
  inspect(
    request: XlsxTemplateInspectRequest,
  ): Promise<XlsxTemplateInspectResult>;
}
