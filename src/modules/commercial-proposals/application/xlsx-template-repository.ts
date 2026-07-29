/**
 * Persistence port for Commercial Proposal XLSX templates.
 *
 * Metadata is stored in Twenty custom objects. Binary XLSX files are stored
 * via Documents `XlsxTemplateStoragePort` (document-service object storage).
 */

import type {
  CommercialProposalXlsxTemplate,
  CommercialProposalXlsxTemplateVersion,
} from '../domain/templates/xlsx-template-version';
import type {
  XlsxTemplateMapping,
  XlsxWorkbookMetadata,
} from 'src/modules/documents';

export type CreateXlsxTemplateVersionInput = {
  displayName: string;
  description?: string;
  originalFileName: string;
  fileSha256: string;
  storageKey: string;
  workbookMetadata: XlsxWorkbookMetadata;
  mapping: XlsxTemplateMapping;
  activate: boolean;
};

export type XlsxTemplateVersionSummary = Pick<
  CommercialProposalXlsxTemplateVersion,
  | 'id'
  | 'templateId'
  | 'version'
  | 'status'
  | 'displayName'
  | 'originalFileName'
  | 'fileSha256'
  | 'storageKey'
  | 'createdAt'
  | 'activatedAt'
> & {
  mappingSchemaVersion: '1.0';
};

export type XlsxTemplateVersionDetail = XlsxTemplateVersionSummary & {
  mapping: XlsxTemplateMapping;
  workbookMetadata: XlsxWorkbookMetadata;
  description?: string | null;
};

export type XlsxTemplateSummary = Pick<
  CommercialProposalXlsxTemplate,
  'id' | 'displayName' | 'status' | 'activeVersionId' | 'updatedAt'
> & {
  versions: XlsxTemplateVersionSummary[];
};

export type XlsxTemplateRepository = {
  createVersion(
    input: CreateXlsxTemplateVersionInput,
  ): Promise<XlsxTemplateVersionDetail>;
  listTemplates(): Promise<XlsxTemplateSummary[]>;
  activateVersion(
    templateVersionId: string,
  ): Promise<XlsxTemplateVersionDetail>;
  getActiveVersion(): Promise<XlsxTemplateVersionDetail | null>;
  getVersion(
    templateVersionId: string,
  ): Promise<XlsxTemplateVersionDetail | null>;
};
