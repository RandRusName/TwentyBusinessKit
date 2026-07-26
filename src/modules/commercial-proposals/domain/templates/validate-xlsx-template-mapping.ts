import {
  type XlsxTemplateMapping,
  type XlsxTemplateMappingIssue,
  validateXlsxTemplateMappingStructure,
} from 'src/modules/documents';

import {
  getXlsxTemplateField,
  isAllowedScalarXlsxTemplateFieldPath,
  isAllowedXlsxTemplateFieldPath,
  scopeForCollectionPath,
  WORK_ITEMS_COLLECTION_PATH,
} from './xlsx-template-fields';

export type XlsxTemplateMappingValidationResult =
  | { ok: true; mapping: XlsxTemplateMapping }
  | { ok: false; issues: XlsxTemplateMappingIssue[] };

/**
 * Business validation for Commercial Proposal → XLSX mappings.
 * Structural A1/shape checks live in Documents; this layer enforces the
 * proposal field allowlist and work-items column requirements.
 */
export const validateCommercialProposalXlsxTemplateMapping = (
  value: unknown,
): XlsxTemplateMappingValidationResult => {
  const structural = validateXlsxTemplateMappingStructure(value);
  if (!structural.ok) {
    return structural;
  }

  const issues: XlsxTemplateMappingIssue[] = [];
  const { mapping } = structural;

  for (const [index, binding] of mapping.scalarBindings.entries()) {
    if (!isAllowedScalarXlsxTemplateFieldPath(binding.fieldPath)) {
      issues.push({
        path: `scalarBindings[${index}].fieldPath`,
        message: `fieldPath '${binding.fieldPath}' is not an allowed scalar Commercial Proposal field`,
      });
      continue;
    }

    const field = getXlsxTemplateField(binding.fieldPath, 'scalar');
    if (
      binding.valueType !== undefined &&
      field !== undefined &&
      binding.valueType !== field.valueType
    ) {
      issues.push({
        path: `scalarBindings[${index}].valueType`,
        message: `valueType must be '${field.valueType}' for ${binding.fieldPath}`,
      });
    }
  }

  for (const [index, binding] of mapping.tableBindings.entries()) {
    const scope = scopeForCollectionPath(binding.collectionPath);
    const columnPaths = new Set(binding.columns.map((column) => column.fieldPath));

    for (const [columnIndex, column] of binding.columns.entries()) {
      if (!isAllowedXlsxTemplateFieldPath(column.fieldPath, scope)) {
        issues.push({
          path: `tableBindings[${index}].columns[${columnIndex}].fieldPath`,
          message: `fieldPath '${column.fieldPath}' is not allowed for ${binding.collectionPath}`,
        });
      }
    }

    if (binding.collectionPath === WORK_ITEMS_COLLECTION_PATH) {
      if (!columnPaths.has('name')) {
        issues.push({
          path: `tableBindings[${index}].columns`,
          message: 'content.workItems table must map column name',
        });
      }
      if (!columnPaths.has('quantity')) {
        issues.push({
          path: `tableBindings[${index}].columns`,
          message: 'content.workItems table must map column quantity',
        });
      }
      if (!columnPaths.has('unitPrice') && !columnPaths.has('lineAmount')) {
        issues.push({
          path: `tableBindings[${index}].columns`,
          message:
            'content.workItems table must map unitPrice or lineAmount',
        });
      }
    }
  }

  if (issues.length > 0) {
    return { ok: false, issues };
  }

  return { ok: true, mapping };
};
