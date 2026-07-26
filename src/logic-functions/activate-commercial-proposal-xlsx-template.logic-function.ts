import { defineLogicFunction, HTTPMethod } from 'twenty-sdk/define';
import { type RoutePayload } from 'twenty-sdk/logic-function';

import { ACTIVATE_COMMERCIAL_PROPOSAL_XLSX_TEMPLATE_LOGIC_FUNCTION_UNIVERSAL_IDENTIFIER } from 'src/constants/universal-identifiers';
import {
  failure,
  toApplicationError,
} from 'src/logic-functions/http-response';
import { createLogicFunctionLogger } from 'src/logic-functions/logic-function-logger';
import { ApplicationError } from 'src/modules/foundation';

type ActivateRequest = {
  templateVersionId?: string;
};

const handler = async (event: RoutePayload<ActivateRequest>) => {
  const logger = createLogicFunctionLogger(
    'activate-commercial-proposal-xlsx-template',
  );

  try {
    if (
      typeof event.body?.templateVersionId !== 'string' ||
      event.body.templateVersionId.trim() === ''
    ) {
      throw new ApplicationError(
        'INVALID_INPUT',
        'templateVersionId is required',
      );
    }

    throw new ApplicationError(
      'FEATURE_NOT_IMPLEMENTED',
      'Activating Commercial Proposal XLSX templates requires persistence. Not implemented yet.',
    );
  } catch (error) {
    const applicationError = toApplicationError(error);
    logger.failure(applicationError.code);
    return failure(applicationError);
  }
};

export default defineLogicFunction({
  universalIdentifier:
    ACTIVATE_COMMERCIAL_PROPOSAL_XLSX_TEMPLATE_LOGIC_FUNCTION_UNIVERSAL_IDENTIFIER,
  name: 'Activate Commercial Proposal XLSX Template',
  description: 'Activates an XLSX template version (persistence pending)',
  timeoutSeconds: 10,
  httpRouteTriggerSettings: {
    path: '/commercial-proposal-templates/activate',
    httpMethod: HTTPMethod.POST,
    isAuthRequired: true,
  },
  handler,
});
