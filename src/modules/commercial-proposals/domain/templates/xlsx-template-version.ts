import type {
  XlsxTemplateMapping,
  XlsxWorkbookMetadata,
} from 'src/modules/documents';

/**
 * Domain model for user-configurable Commercial Proposal XLSX templates.
 *
 * Persistence: Twenty custom objects store metadata only (storageKey + sha256 +
 * mapping + workbook metadata). XLSX binaries live in document-service object
 * storage. Generation uses the single global ACTIVE version when present.
 */

export type CommercialProposalXlsxTemplateStatus =
  | 'DRAFT'
  | 'ACTIVE'
  | 'ARCHIVED';

export type CommercialProposalXlsxTemplate = {
  id: string;
  displayName: string;
  description?: string | null;
  status: CommercialProposalXlsxTemplateStatus;
  activeVersionId: string | null;
  createdAt: string;
  updatedAt: string;
};

export type CommercialProposalXlsxTemplateVersion = {
  id: string;
  templateId: string;
  version: number;
  status: CommercialProposalXlsxTemplateStatus;
  displayName: string;
  description?: string | null;
  originalFileName: string;
  fileSha256: string;
  storageKey: string;
  workbookMetadata: XlsxWorkbookMetadata;
  mapping: XlsxTemplateMapping;
  createdAt: string;
  updatedAt: string;
  activatedAt: string | null;
};

/**
 * Optional audit fields for generated proposal result metadata.
 * Existing V1/V2 shapes remain valid when these are absent.
 */
export type CommercialProposalGeneratedTemplateAudit = {
  templateSource: 'built-in' | 'custom-xlsx';
  templateId?: string;
  templateVersionId?: string;
  templateFileSha256?: string;
  mappingSchemaVersion?: '1.0';
};

/**
 * Persistence is implemented via CommercialProposalXlsxTemplate /
 * CommercialProposalXlsxTemplateVersion metadata + document-service storage.
 */
export const XLSX_TEMPLATE_PERSISTENCE_STATUS = 'implemented' as const;
