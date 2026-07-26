import { defineLogicFunction, HTTPMethod } from 'twenty-sdk/define';
import { type RoutePayload } from 'twenty-sdk/logic-function';

import { INSPECT_COMMERCIAL_PROPOSAL_XLSX_TEMPLATE_LOGIC_FUNCTION_UNIVERSAL_IDENTIFIER } from 'src/constants/universal-identifiers';
import {
  failure,
  json,
  toApplicationError,
} from 'src/logic-functions/http-response';
import { createLogicFunctionLogger } from 'src/logic-functions/logic-function-logger';
import { ApplicationError } from 'src/modules/foundation';
import { HttpDocumentServiceAdapter } from 'src/modules/documents';

type InspectRequest = {
  templateFileBase64?: string;
  contentBase64?: string;
  originalFileName?: string;
};

const handler = async (event: RoutePayload<InspectRequest>) => {
  const logger = createLogicFunctionLogger(
    'inspect-commercial-proposal-xlsx-template',
  );

  try {
    const body = event.body ?? {};
    const templateFileBase64 =
      typeof body.templateFileBase64 === 'string' &&
      body.templateFileBase64.trim() !== ''
        ? body.templateFileBase64
        : typeof body.contentBase64 === 'string'
          ? body.contentBase64
          : '';
    if (templateFileBase64.trim() === '') {
      throw new ApplicationError(
        'INVALID_INPUT',
        'templateFileBase64 (or contentBase64) is required',
      );
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

    const documentService = new HttpDocumentServiceAdapter();
    const result = await documentService.inspectXlsxTemplate({
      templateFileBase64,
      originalFileName: body.originalFileName,
      requestId: logger.requestId,
    });

    logger.success({
      sheetCount: result.workbook.sheets.length,
    });

    return json({
      status: 'success',
      requestId: logger.requestId,
      workbook: result.workbook,
      sha256: result.sha256,
    });
  } catch (error) {
    const applicationError = toApplicationError(error);
    logger.failure(applicationError.code);
    return failure(applicationError);
  }
};

export default defineLogicFunction({
  universalIdentifier:
    INSPECT_COMMERCIAL_PROPOSAL_XLSX_TEMPLATE_LOGIC_FUNCTION_UNIVERSAL_IDENTIFIER,
  name: 'Inspect Commercial Proposal XLSX Template',
  description:
    'Inspect an uploaded XLSX template workbook for Commercial Proposal cell mapping',
  timeoutSeconds: 30,
  httpRouteTriggerSettings: {
    path: '/commercial-proposal-templates/inspect-xlsx',
    httpMethod: HTTPMethod.POST,
    isAuthRequired: true,
  },
  handler,
});
