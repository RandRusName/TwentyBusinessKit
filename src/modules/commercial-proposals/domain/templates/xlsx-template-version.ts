import type {
  XlsxTemplateMapping,
  XlsxWorkbookMetadata,
} from 'src/modules/documents';

/**
 * Domain model for user-configurable Commercial Proposal XLSX templates.
 *
 * Persistence (Twenty custom objects / object storage) is intentionally not
 * wired in this foundation pass. Upload creates a new immutable version;
 * generated proposals should record which version/mapping was used.
 */

export type CommercialProposalXlsxTemplateStatus =
  | 'DRAFT'
  | 'ACTIVE'
  | 'ARCHIVED';

export type CommercialProposalXlsxTemplate = {
  id: string;
  displayName: string;
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
  originalFileName: string;
  fileSha256: string;
  storageKey: string;
  workbookMetadata: XlsxWorkbookMetadata;
  mapping: XlsxTemplateMapping;
  createdAt: string;
  updatedAt: string;
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
 * Persistence TODO (next pass):
 * - CommercialProposalXlsxTemplate / Version metadata objects
 * - object-storage upload for template binaries
 * - create-version / list / activate logic functions
 * - optional CommercialProposal.xlsxTemplateVersionId field
 */
export const XLSX_TEMPLATE_PERSISTENCE_STATUS = 'domain-only' as const;
