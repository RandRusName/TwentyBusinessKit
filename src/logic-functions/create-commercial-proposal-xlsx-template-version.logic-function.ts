import { defineLogicFunction, HTTPMethod } from 'twenty-sdk/define';
import { type RoutePayload } from 'twenty-sdk/logic-function';

import { CREATE_COMMERCIAL_PROPOSAL_XLSX_TEMPLATE_VERSION_LOGIC_FUNCTION_UNIVERSAL_IDENTIFIER } from 'src/constants/universal-identifiers';
import {
  failure,
  json,
  toApplicationError,
} from 'src/logic-functions/http-response';
import { createLogicFunctionLogger } from 'src/logic-functions/logic-function-logger';
import { createPersistedXlsxTemplateVersion } from 'src/modules/commercial-proposals';
import { TwentyXlsxTemplateRepository } from 'src/modules/commercial-proposals';
import { HttpDocumentServiceAdapter } from 'src/modules/documents';
import { ApplicationError } from 'src/modules/foundation';

type CreateVersionRequest = {
  displayName?: string;
  description?: string;
  originalFileName?: string;
  contentBase64?: string;
  workbook?: unknown;
  mapping?: unknown;
  activate?: boolean;
  expectedSha256?: string;
};

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

    const documentClient = new HttpDocumentServiceAdapter();
    const templateVersion = await createPersistedXlsxTemplateVersion({
      input: {
        displayName: body.displayName,
        description:
          typeof body.description === 'string' ? body.description : undefined,
        originalFileName: body.originalFileName,
        contentBase64: body.contentBase64,
        mapping: body.mapping,
        activate: body.activate === true,
        requestId: logger.requestId,
        expectedSha256:
          typeof body.expectedSha256 === 'string'
            ? body.expectedSha256
            : undefined,
      },
      repository: new TwentyXlsxTemplateRepository(),
      storage: {
        storeXlsxTemplate: (input) => documentClient.storeXlsxTemplate(input),
      },
    });

    logger.success({
      templateVersionId: templateVersion.id,
      version: templateVersion.version,
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
    CREATE_COMMERCIAL_PROPOSAL_XLSX_TEMPLATE_VERSION_LOGIC_FUNCTION_UNIVERSAL_IDENTIFIER,
  name: 'Create Commercial Proposal XLSX Template Version',
  description:
    'Stores an uploaded XLSX template in object storage and creates an immutable version record',
  timeoutSeconds: 60,
  httpRouteTriggerSettings: {
    path: '/commercial-proposal-templates/create-version',
    httpMethod: HTTPMethod.POST,
    isAuthRequired: true,
  },
  handler,
});
