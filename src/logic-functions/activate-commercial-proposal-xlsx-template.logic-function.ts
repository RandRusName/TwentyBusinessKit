import { defineLogicFunction, HTTPMethod } from 'twenty-sdk/define';
import { type RoutePayload } from 'twenty-sdk/logic-function';

import { ACTIVATE_COMMERCIAL_PROPOSAL_XLSX_TEMPLATE_LOGIC_FUNCTION_UNIVERSAL_IDENTIFIER } from 'src/constants/universal-identifiers';
import {
  failure,
  json,
  toApplicationError,
} from 'src/logic-functions/http-response';
import { createLogicFunctionLogger } from 'src/logic-functions/logic-function-logger';
import { TwentyXlsxTemplateRepository } from 'src/modules/commercial-proposals';
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

    const templateVersion = await new TwentyXlsxTemplateRepository().activateVersion(
      event.body.templateVersionId.trim(),
    );

    logger.success({
      templateVersionId: templateVersion.id,
      status: templateVersion.status,
    });

    return json({
      status: 'success',
      requestId: logger.requestId,
      templateVersion: {
        id: templateVersion.id,
        templateId: templateVersion.templateId,
        version: templateVersion.version,
        status: templateVersion.status,
        displayName: templateVersion.displayName,
        originalFileName: templateVersion.originalFileName,
        fileSha256: templateVersion.fileSha256,
        storageKey: templateVersion.storageKey,
        createdAt: templateVersion.createdAt,
        activatedAt: templateVersion.activatedAt,
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
    ACTIVATE_COMMERCIAL_PROPOSAL_XLSX_TEMPLATE_LOGIC_FUNCTION_UNIVERSAL_IDENTIFIER,
  name: 'Activate Commercial Proposal XLSX Template',
  description:
    'Activates an immutable XLSX template version as the global ACTIVE template',
  timeoutSeconds: 15,
  httpRouteTriggerSettings: {
    path: '/commercial-proposal-templates/activate',
    httpMethod: HTTPMethod.POST,
    isAuthRequired: true,
  },
  handler,
});
