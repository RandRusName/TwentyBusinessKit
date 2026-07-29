import { defineLogicFunction, HTTPMethod } from 'twenty-sdk/define';
import { type RoutePayload } from 'twenty-sdk/logic-function';

import { LIST_COMMERCIAL_PROPOSAL_XLSX_TEMPLATES_LOGIC_FUNCTION_UNIVERSAL_IDENTIFIER } from 'src/constants/universal-identifiers';
import {
  failure,
  json,
  toApplicationError,
} from 'src/logic-functions/http-response';
import { createLogicFunctionLogger } from 'src/logic-functions/logic-function-logger';
import { TwentyXlsxTemplateRepository } from 'src/modules/commercial-proposals';
const handler = async (_event: RoutePayload<Record<string, never>>) => {
  const logger = createLogicFunctionLogger(
    'list-commercial-proposal-xlsx-templates',
  );

  try {
    const repository = new TwentyXlsxTemplateRepository();
    const templates = await repository.listTemplates();
    const active = await repository.getActiveVersion();

    logger.success({
      templateCount: templates.length,
      activeVersionId: active?.id ?? null,
    });

    return json({
      status: 'success',
      requestId: logger.requestId,
      templates,
      activeVersion: active === null
        ? null
        : {
            id: active.id,
            templateId: active.templateId,
            version: active.version,
            status: active.status,
            displayName: active.displayName,
            originalFileName: active.originalFileName,
            fileSha256: active.fileSha256,
            storageKey: active.storageKey,
            mappingSchemaVersion: active.mappingSchemaVersion,
            createdAt: active.createdAt,
            activatedAt: active.activatedAt,
          },
    });
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
  description: 'Lists saved Commercial Proposal XLSX template versions',
  timeoutSeconds: 15,
  httpRouteTriggerSettings: {
    path: '/commercial-proposal-templates/list',
    httpMethod: HTTPMethod.POST,
    isAuthRequired: true,
  },
  handler,
});
