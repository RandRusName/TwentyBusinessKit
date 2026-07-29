import { defineLogicFunction, HTTPMethod } from 'twenty-sdk/define';
import { type RoutePayload } from 'twenty-sdk/logic-function';

import { VALIDATE_COMMERCIAL_PROPOSAL_XLSX_TEMPLATE_MAPPING_LOGIC_FUNCTION_UNIVERSAL_IDENTIFIER } from 'src/constants/universal-identifiers';
import {
  failure,
  json,
  toApplicationError,
} from 'src/logic-functions/http-response';
import { createLogicFunctionLogger } from 'src/logic-functions/logic-function-logger';
import {
  validateCommercialProposalXlsxTemplateMapping,
  validateXlsxTemplateMappingAgainstWorkbook,
} from 'src/modules/commercial-proposals';
import { ApplicationError } from 'src/modules/foundation';
import type { XlsxWorkbookMetadata } from 'src/modules/documents';

type ValidateRequest = {
  mapping?: unknown;
  workbook?: XlsxWorkbookMetadata;
};

const handler = async (event: RoutePayload<ValidateRequest>) => {
  const logger = createLogicFunctionLogger(
    'validate-commercial-proposal-xlsx-template-mapping',
  );

  try {
    const result = validateCommercialProposalXlsxTemplateMapping(
      event.body?.mapping,
    );

    if (!result.ok) {
      throw new ApplicationError(
        'COMMERCIAL_PROPOSAL_VALIDATION_FAILED',
        result.issues.map((issue) => issue.message).join('; '),
        undefined,
        result.issues[0],
      );
    }

    const workbookResult = validateXlsxTemplateMappingAgainstWorkbook({
      mapping: result.mapping,
      workbook: event.body?.workbook,
      mode: 'warn',
    });

    logger.success({
      scalarBindings: result.mapping.scalarBindings.length,
      tableBindings: result.mapping.tableBindings.length,
      warningCount: workbookResult.warnings.length,
    });

    return json({
      status: 'success',
      valid: true as const,
      requestId: logger.requestId,
      mapping: result.mapping,
      warnings: workbookResult.warnings,
    });
  } catch (error) {
    const applicationError = toApplicationError(error);
    logger.failure(applicationError.code);
    return failure(applicationError);
  }
};

export default defineLogicFunction({
  universalIdentifier:
    VALIDATE_COMMERCIAL_PROPOSAL_XLSX_TEMPLATE_MAPPING_LOGIC_FUNCTION_UNIVERSAL_IDENTIFIER,
  name: 'Validate Commercial Proposal XLSX Template Mapping',
  description:
    'Validate Commercial Proposal field-to-cell XLSX template mapping before save or generation',
  timeoutSeconds: 10,
  httpRouteTriggerSettings: {
    path: '/commercial-proposal-templates/validate-mapping',
    httpMethod: HTTPMethod.POST,
    isAuthRequired: true,
  },
  handler,
});
