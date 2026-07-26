/**
 * Persistence port for Commercial Proposal XLSX templates.
 *
 * Not wired yet — create-version / list / activate routes return
 * FEATURE_NOT_IMPLEMENTED until Twenty metadata objects + object storage
 * upload are implemented.
 */

import type {
  CommercialProposalXlsxTemplate,
  CommercialProposalXlsxTemplateVersion,
} from '../domain/templates/xlsx-template-version';
import type { XlsxTemplateMapping, XlsxWorkbookMetadata } from 'src/modules/documents';

export type CreateXlsxTemplateVersionInput = {
  displayName: string;
  description?: string;
  originalFileName: string;
  contentBase64: string;
  workbook: XlsxWorkbookMetadata;
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
  | 'createdAt'
>;

export type XlsxTemplateSummary = Pick<
  CommercialProposalXlsxTemplate,
  'id' | 'displayName' | 'status' | 'activeVersionId' | 'updatedAt'
> & {
  versions: XlsxTemplateVersionSummary[];
};

export type XlsxTemplateRepository = {
  createVersion(
    input: CreateXlsxTemplateVersionInput,
  ): Promise<XlsxTemplateVersionSummary>;
  listTemplates(): Promise<XlsxTemplateSummary[]>;
  activateVersion(
    templateVersionId: string,
  ): Promise<XlsxTemplateVersionSummary>;
  getActiveVersion(): Promise<XlsxTemplateVersionSummary | null>;
};
