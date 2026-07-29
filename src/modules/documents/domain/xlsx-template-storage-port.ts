import type { XlsxWorkbookMetadata } from './xlsx-workbook-metadata';

export type XlsxTemplateStoreRequest = {
  requestId?: string;
  originalFileName: string;
  templateFileBase64: string;
  expectedSha256?: string;
};

export type XlsxTemplateStoreResult = {
  status: 'success';
  storageKey: string;
  sha256: string;
  workbook: XlsxWorkbookMetadata;
};

export type XlsxTemplateStoragePort = {
  storeXlsxTemplate(
    input: XlsxTemplateStoreRequest,
  ): Promise<XlsxTemplateStoreResult>;
  getXlsxTemplateFile?(input: {
    storageKey: string;
    sha256: string;
  }): Promise<{
    templateFileBase64: string;
    sha256: string;
  }>;
};
