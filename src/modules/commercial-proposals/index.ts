/**
 * Commercial Proposals public API.
 *
 * Stable repository contracts used by other app layers. Most proposal domain
 * code still lives in legacy `src/domain` / `src/services` folders during
 * incremental migration — see docs/architecture/migration-plan.md.
 */

export type {
  ProposalDraftRepository,
  ProposalGenerationRepository,
} from './application/proposal-repositories';

export type {
  CreateXlsxTemplateVersionInput,
  XlsxTemplateRepository,
  XlsxTemplateSummary,
  XlsxTemplateVersionDetail,
  XlsxTemplateVersionSummary,
} from './application/xlsx-template-repository';

export { createPersistedXlsxTemplateVersion } from './application/create-persisted-xlsx-template-version';
export { TwentyXlsxTemplateRepository } from './infrastructure/twenty-xlsx-template.repository';

export {
  COMMERCIAL_PROPOSAL_XLSX_TEMPLATE_FIELDS,
  getXlsxTemplateField,
  isAllowedScalarXlsxTemplateFieldPath,
  isAllowedXlsxTemplateFieldPath,
  listXlsxTemplateFields,
  PLAN_COLLECTION_PATH,
  scopeForCollectionPath,
  WORK_ITEMS_COLLECTION_PATH,
  type XlsxTemplateFieldDefinition,
  type XlsxTemplateFieldScope,
} from './domain/templates/xlsx-template-fields';

export {
  validateCommercialProposalXlsxTemplateMapping,
  type XlsxTemplateMappingValidationResult,
} from './domain/templates/validate-xlsx-template-mapping';

export {
  validateXlsxTemplateMappingAgainstWorkbook,
  type XlsxTemplateWorkbookValidationIssue,
  type XlsxTemplateWorkbookValidationMode,
  type XlsxTemplateWorkbookValidationResult,
} from './domain/templates/validate-xlsx-template-mapping-against-workbook';

export {
  XLSX_TEMPLATE_PERSISTENCE_STATUS,
  type CommercialProposalGeneratedTemplateAudit,
  type CommercialProposalXlsxTemplate,
  type CommercialProposalXlsxTemplateStatus,
  type CommercialProposalXlsxTemplateVersion,
} from './domain/templates/xlsx-template-version';
