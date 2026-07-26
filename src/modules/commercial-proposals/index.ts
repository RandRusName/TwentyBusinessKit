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
  XlsxTemplateVersionSummary,
} from './application/xlsx-template-repository';

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
  XLSX_TEMPLATE_PERSISTENCE_STATUS,
  type CommercialProposalGeneratedTemplateAudit,
  type CommercialProposalXlsxTemplate,
  type CommercialProposalXlsxTemplateStatus,
  type CommercialProposalXlsxTemplateVersion,
} from './domain/templates/xlsx-template-version';
