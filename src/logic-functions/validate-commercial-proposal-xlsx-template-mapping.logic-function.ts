import { defineLogicFunction, HTTPMethod } from 'twenty-sdk/define';
import { type RoutePayload } from 'twenty-sdk/logic-function';

import { VALIDATE_COMMERCIAL_PROPOSAL_XLSX_TEMPLATE_MAPPING_LOGIC_FUNCTION_UNIVERSAL_IDENTIFIER } from 'src/constants/universal-identifiers';
import {
  failure,
  json,
  toApplicationError,
} from 'src/logic-functions/http-response';
import { createLogicFunctionLogger } from 'src/logic-functions/logic-function-logger';
import { validateCommercialProposalXlsxTemplateMapping } from 'src/modules/commercial-proposals';
import { ApplicationError } from 'src/modules/foundation';
import type {
  XlsxTemplateMapping,
  XlsxWorkbookMetadata,
} from 'src/modules/documents';

type ValidateRequest = {
  mapping?: unknown;
  workbook?: XlsxWorkbookMetadata;
};

const collectWorkbookWarnings = (
  mapping: XlsxTemplateMapping,
  workbook: XlsxWorkbookMetadata | undefined,
) => {
  const warnings: Array<{ code: string; message: string; path?: string }> = [];
  if (workbook === undefined || !Array.isArray(workbook.sheets)) {
    return warnings;
  }

  const sheetNames = new Set(workbook.sheets.map((sheet) => sheet.name));
  for (const [index, binding] of mapping.scalarBindings.entries()) {
    if (!sheetNames.has(binding.sheetName)) {
      warnings.push({
        code: 'UNKNOWN_SHEET',
        path: `scalarBindings[${index}].sheetName`,
        message: `Sheet '${binding.sheetName}' was not found in inspected workbook`,
      });
    }
  }
  for (const [index, binding] of mapping.tableBindings.entries()) {
    if (!sheetNames.has(binding.sheetName)) {
      warnings.push({
        code: 'UNKNOWN_SHEET',
        path: `tableBindings[${index}].sheetName`,
        message: `Sheet '${binding.sheetName}' was not found in inspected workbook`,
      });
    }

    const sheet = workbook.sheets.find(
      (candidate) => candidate.name === binding.sheetName,
    );
    if (sheet === undefined) {
      continue;
    }
    const templateRowMerges = sheet.mergedRanges.filter((range) => {
      const match = /^[A-Z]+(\d+):[A-Z]+(\d+)$/i.exec(range.replace(/\$/g, ''));
      if (match === null) return false;
      const start = Number(match[1]);
      const end = Number(match[2]);
      return (
        start !== end &&
        start <= binding.templateRow &&
        binding.templateRow <= end
      );
    });
    if (templateRowMerges.length > 0) {
      warnings.push({
        code: 'VERTICAL_MERGE_ON_TEMPLATE_ROW',
        path: `tableBindings[${index}].templateRow`,
        message:
          'Merged cells spanning multiple rows on the template row may be rejected during render',
      });
    }
  }

  return warnings;
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

    const warnings = collectWorkbookWarnings(
      result.mapping,
      event.body?.workbook,
    );

    logger.success({
      scalarBindings: result.mapping.scalarBindings.length,
      tableBindings: result.mapping.tableBindings.length,
      warningCount: warnings.length,
    });

    return json({
      status: 'success',
      valid: true as const,
      requestId: logger.requestId,
      mapping: result.mapping,
      warnings,
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
