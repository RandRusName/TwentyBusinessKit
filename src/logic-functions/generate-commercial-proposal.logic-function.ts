import { defineLogicFunction, HTTPMethod } from 'twenty-sdk/define';
import { type RoutePayload } from 'twenty-sdk/logic-function';

import { GENERATE_COMMERCIAL_PROPOSAL_LOGIC_FUNCTION_UNIVERSAL_IDENTIFIER } from 'src/constants/universal-identifiers';
import {
  failure,
  json,
  toApplicationError,
} from 'src/logic-functions/http-response';
import { HttpDocumentServiceAdapter } from 'src/modules/documents';
import { TwentyXlsxTemplateRepository } from 'src/modules/commercial-proposals';
import { TwentyRecordRepository } from 'src/services/twenty-record-repository';
import {
  generateCommercialProposalDocuments,
  normalizeGenerateCommercialProposalRequest,
  type GenerateCommercialProposalRequest,
} from 'src/domain/commercial-proposal';
import {
  createLogicFunctionLogger,
  summarizeInternalError,
} from 'src/logic-functions/logic-function-logger';

const handler = async (
  event: RoutePayload<GenerateCommercialProposalRequest>,
) => {
  const logger = createLogicFunctionLogger('generate-commercial-proposal', {
    proposalId: event.body?.commercialProposalId,
    operationId: event.body?.idempotencyKey,
  });
  try {
    const result = await generateCommercialProposalDocuments({
      input: normalizeGenerateCommercialProposalRequest(
        event.body ?? undefined,
      ),
      repository: new TwentyRecordRepository(),
      documentClient: new HttpDocumentServiceAdapter(),
      xlsxTemplateRepository: new TwentyXlsxTemplateRepository(),
    });

    logger.success({ statusAfter: result.commercialProposal.status });
    return json({ status: 'success', ...result, requestId: logger.requestId });
  } catch (error) {
    const applicationError = toApplicationError(error);

    logger.failure(applicationError.code, summarizeInternalError(error));

    return failure(applicationError);
  }
};

export default defineLogicFunction({
  universalIdentifier:
    GENERATE_COMMERCIAL_PROPOSAL_LOGIC_FUNCTION_UNIVERSAL_IDENTIFIER,
  name: 'Generate Commercial Proposal Documents',
  description:
    'Calls the external document service and stores generated XLSX/PDF metadata',
  timeoutSeconds: 60,
  httpRouteTriggerSettings: {
    path: '/commercial-proposals/generate',
    httpMethod: HTTPMethod.POST,
    isAuthRequired: true,
  },
  handler,
});
