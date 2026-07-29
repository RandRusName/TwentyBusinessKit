import type { XlsxTemplateStoragePort } from 'src/modules/documents';
import type {
  CreateXlsxTemplateVersionInput,
  XlsxTemplateRepository,
  XlsxTemplateVersionDetail,
} from '../application/xlsx-template-repository';
import { validateCommercialProposalXlsxTemplateMapping } from '../domain/templates/validate-xlsx-template-mapping';
import { validateXlsxTemplateMappingAgainstWorkbook } from '../domain/templates/validate-xlsx-template-mapping-against-workbook';
import { ApplicationError } from 'src/modules/foundation';

export type CreatePersistedXlsxTemplateVersionInput = {
  displayName: string;
  description?: string;
  originalFileName: string;
  contentBase64: string;
  mapping: unknown;
  activate: boolean;
  requestId?: string;
  expectedSha256?: string;
};

/**
 * Orchestrates store → strict validate → persist metadata for create-version.
 */
export const createPersistedXlsxTemplateVersion = async ({
  input,
  repository,
  storage,
}: {
  input: CreatePersistedXlsxTemplateVersionInput;
  repository: XlsxTemplateRepository;
  storage: XlsxTemplateStoragePort;
}): Promise<XlsxTemplateVersionDetail> => {
  const displayName = input.displayName.trim();
  if (displayName === '') {
    throw new ApplicationError('INVALID_INPUT', 'displayName is required');
  }
  if (input.originalFileName.trim() === '') {
    throw new ApplicationError('INVALID_INPUT', 'originalFileName is required');
  }
  if (input.contentBase64.trim() === '') {
    throw new ApplicationError('INVALID_INPUT', 'contentBase64 is required');
  }

  const mappingResult = validateCommercialProposalXlsxTemplateMapping(
    input.mapping,
  );
  if (!mappingResult.ok) {
    throw new ApplicationError(
      'COMMERCIAL_PROPOSAL_VALIDATION_FAILED',
      mappingResult.issues.map((issue) => issue.message).join('; '),
      undefined,
      mappingResult.issues[0],
    );
  }

  const stored = await storage.storeXlsxTemplate({
    requestId: input.requestId,
    originalFileName: input.originalFileName,
    templateFileBase64: input.contentBase64,
    expectedSha256: input.expectedSha256,
  });

  const workbookValidation = validateXlsxTemplateMappingAgainstWorkbook({
    mapping: mappingResult.mapping,
    workbook: stored.workbook,
    mode: 'strict',
  });
  if (!workbookValidation.ok) {
    throw new ApplicationError(
      'COMMERCIAL_PROPOSAL_VALIDATION_FAILED',
      workbookValidation.issues.map((issue) => issue.message).join('; '),
      undefined,
      workbookValidation.issues[0],
    );
  }

  const persistInput: CreateXlsxTemplateVersionInput = {
    displayName,
    description: input.description,
    originalFileName: input.originalFileName,
    fileSha256: stored.sha256,
    storageKey: stored.storageKey,
    workbookMetadata: stored.workbook,
    mapping: mappingResult.mapping,
    activate: input.activate,
  };

  return repository.createVersion(persistInput);
};
