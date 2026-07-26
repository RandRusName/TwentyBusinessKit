import { defineLogicFunction, HTTPMethod } from 'twenty-sdk/define';
import { type RoutePayload } from 'twenty-sdk/logic-function';

import { LIST_COMMERCIAL_PROPOSAL_XLSX_TEMPLATES_LOGIC_FUNCTION_UNIVERSAL_IDENTIFIER } from 'src/constants/universal-identifiers';
import {
  failure,
  toApplicationError,
} from 'src/logic-functions/http-response';
import { createLogicFunctionLogger } from 'src/logic-functions/logic-function-logger';
import { ApplicationError } from 'src/modules/foundation';

const handler = async (_event: RoutePayload<Record<string, never>>) => {
  const logger = createLogicFunctionLogger(
    'list-commercial-proposal-xlsx-templates',
  );

  try {
    throw new ApplicationError(
      'FEATURE_NOT_IMPLEMENTED',
      'Listing Commercial Proposal XLSX templates requires persistence (metadata objects + object storage). Not implemented yet.',
    );
  } catch (error) {
    const applicationError = toApplicationError(error);
    logger.failure(applicationError.code);
    return failure(applicationError);
  }
};

export default defineLogicFunction({
  universalIdentifier:
    LIST_COMMERCIAL_PROPOSAL_XLSX_TEMPLATES_LOGIC_FUNCTION_UNIVERSAL_IDENTIFIER,
  name: 'List Commercial Proposal XLSX Templates',
  description: 'Lists saved XLSX template versions (persistence pending)',
  timeoutSeconds: 10,
  httpRouteTriggerSettings: {
    path: '/commercial-proposal-templates/list',
    httpMethod: HTTPMethod.POST,
    isAuthRequired: true,
  },
  handler,
});
