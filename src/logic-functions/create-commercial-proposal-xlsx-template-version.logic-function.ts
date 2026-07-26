import { defineLogicFunction, HTTPMethod } from 'twenty-sdk/define';
import { type RoutePayload } from 'twenty-sdk/logic-function';

import { CREATE_COMMERCIAL_PROPOSAL_XLSX_TEMPLATE_VERSION_LOGIC_FUNCTION_UNIVERSAL_IDENTIFIER } from 'src/constants/universal-identifiers';
import {
  failure,
  toApplicationError,
} from 'src/logic-functions/http-response';
import { createLogicFunctionLogger } from 'src/logic-functions/logic-function-logger';
import { validateCommercialProposalXlsxTemplateMapping } from 'src/modules/commercial-proposals';
import { ApplicationError } from 'src/modules/foundation';

type CreateVersionRequest = {
  displayName?: string;
  description?: string;
  originalFileName?: string;
  contentBase64?: string;
  workbook?: unknown;
  mapping?: unknown;
  activate?: boolean;
};

const PERSISTENCE_MESSAGE =
  'Commercial Proposal XLSX template persistence is not implemented yet. Inspect and validate mappings are available; create-version will land with object-storage + metadata objects.';

const handler = async (event: RoutePayload<CreateVersionRequest>) => {
  const logger = createLogicFunctionLogger(
    'create-commercial-proposal-xlsx-template-version',
  );

  try {
    const body = event.body ?? {};
    if (
      typeof body.displayName !== 'string' ||
      body.displayName.trim() === ''
    ) {
      throw new ApplicationError('INVALID_INPUT', 'displayName is required');
    }
    if (
      typeof body.originalFileName !== 'string' ||
      body.originalFileName.trim() === ''
    ) {
      throw new ApplicationError(
        'INVALID_INPUT',
        'originalFileName is required',
      );
    }
    if (
      typeof body.contentBase64 !== 'string' ||
      body.contentBase64.trim() === ''
    ) {
      throw new ApplicationError('INVALID_INPUT', 'contentBase64 is required');
    }

    const mappingResult = validateCommercialProposalXlsxTemplateMapping(
      body.mapping,
    );
    if (!mappingResult.ok) {
      throw new ApplicationError(
        'COMMERCIAL_PROPOSAL_VALIDATION_FAILED',
        mappingResult.issues.map((issue) => issue.message).join('; '),
        undefined,
        mappingResult.issues[0],
      );
    }

    throw new ApplicationError('FEATURE_NOT_IMPLEMENTED', PERSISTENCE_MESSAGE);
  } catch (error) {
    const applicationError = toApplicationError(error);
    logger.failure(applicationError.code);
    return failure(applicationError);
  }
};

export default defineLogicFunction({
  universalIdentifier:
    CREATE_COMMERCIAL_PROPOSAL_XLSX_TEMPLATE_VERSION_LOGIC_FUNCTION_UNIVERSAL_IDENTIFIER,
  name: 'Create Commercial Proposal XLSX Template Version',
  description:
    'Creates a new immutable XLSX template version (persistence pending)',
  timeoutSeconds: 30,
  httpRouteTriggerSettings: {
    path: '/commercial-proposal-templates/create-version',
    httpMethod: HTTPMethod.POST,
    isAuthRequired: true,
  },
  handler,
});
