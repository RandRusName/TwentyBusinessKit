import { describe, expect, it } from 'vitest';

import {
  getXlsxTemplateField,
  isAllowedXlsxTemplateFieldPath,
  listXlsxTemplateFields,
  validateCommercialProposalXlsxTemplateMapping,
} from 'src/modules/commercial-proposals';
import { validateXlsxTemplateMappingStructure } from 'src/modules/documents';
import { buildDocumentGenerationPayloadV2 } from 'src/domain/commercial-proposal';
import type { CommercialProposalAggregate } from 'src/domain/commercial-proposal-aggregate';

const validWorkItemsTable = {
  kind: 'table' as const,
  collectionPath: 'content.workItems' as const,
  sheetName: 'КП',
  templateRow: 15,
  insertMode: 'insertRowsAndShiftDown' as const,
  minRows: 1,
  copyStyleFromTemplateRow: true,
  preserveFormulas: true,
  columns: [
    { fieldPath: 'name', cell: 'B15' },
    { fieldPath: 'quantity', cell: 'C15' },
    { fieldPath: 'unitPrice', cell: 'D15' },
  ],
};

const validMapping = {
  schemaVersion: '1.0' as const,
  scalarBindings: [
    {
      kind: 'scalar' as const,
      fieldPath: 'proposal.number',
      sheetName: 'КП',
      cell: 'B2',
    },
    {
      kind: 'scalar' as const,
      fieldPath: 'customer.companyName',
      sheetName: 'КП',
      cell: 'B3',
    },
  ],
  tableBindings: [validWorkItemsTable],
};

const aggregateFixture = (): CommercialProposalAggregate => ({
  proposal: {
    id: '11111111-1111-4111-8111-111111111111',
    title: 'Интеграция CRM',
    number: 'КП-007 от 20.07.2026',
    finalNumberKey: '2026:007',
    status: 'DRAFT',
    version: 1,
    contentModelVersion: 'AGGREGATE_V2',
    editorRevision: 3,
    lastEditorOperationId: null,
    sourceType: 'OPPORTUNITY',
    templateCode: 'standard-commercial-proposal',
    templateVersion: null,
    language: 'ru-RU',
    payloadSnapshot: null,
    resultMetadata: null,
    opportunityId: '22222222-2222-4222-8222-222222222222',
    companyId: '33333333-3333-4333-8333-333333333333',
    contactName: 'Иван Иванов',
    contextAndGoal: 'Автоматизировать обработку лидов',
    validityDays: 14,
    paymentTerms: '50% аванс',
    assumptions: 'Доступы предоставляет заказчик',
    nextStep: 'Согласовать старт',
    amount: 1900,
    currencyCode: 'RUB',
    generatedAt: null,
    idempotencyKey: '44444444-4444-4444-8444-444444444444',
    lastError: null,
  },
  items: [
    {
      catalogItemId: null,
      id: '55555555-5555-4555-8555-555555555555',
      commercialProposalId: '11111111-1111-4111-8111-111111111111',
      clientKey: '66666666-6666-4666-8666-666666666666',
      position: 1,
      block: 'Анализ',
      name: 'Интервью',
      description: 'Сбор требований',
      quantity: 2,
      unit: 'час',
      unitPrice: 1000,
      discountPercent: 5,
      lineAmount: 1900,
      currencyCode: 'RUB',
    },
  ],
  stages: [
    {
      id: '77777777-7777-4777-8777-777777777777',
      commercialProposalId: '11111111-1111-4111-8111-111111111111',
      clientKey: '88888888-8888-4888-8888-888888888888',
      position: 1,
      title: 'Диагностика',
      result: 'Согласованные требования',
      duration: '2 дня',
      description: 'Интервью с командой',
    },
  ],
});

describe('xlsx template field registry', () => {
  it('lists scalar and repeating fields', () => {
    const fields = listXlsxTemplateFields();
    expect(fields.some((field) => field.path === 'proposal.number')).toBe(true);
    expect(
      fields.some(
        (field) => field.scope === 'workItems' && field.path === 'lineAmount',
      ),
    ).toBe(true);
    expect(isAllowedXlsxTemplateFieldPath('proposal.amount')).toBe(true);
    expect(getXlsxTemplateField('name', 'workItems')?.valueType).toBe('string');
  });
});

describe('xlsx template mapping validation', () => {
  it('accepts a minimal valid workItems mapping', () => {
    const result = validateCommercialProposalXlsxTemplateMapping(validMapping);
    expect(result.ok).toBe(true);
  });

  it('rejects invalid A1 cells', () => {
    const result = validateXlsxTemplateMappingStructure({
      ...validMapping,
      scalarBindings: [
        {
          kind: 'scalar',
          fieldPath: 'proposal.number',
          sheetName: 'КП',
          cell: '15B',
        },
      ],
      tableBindings: [],
    });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.issues[0]?.message).toMatch(/A1/);
    }
  });

  it('rejects duplicate scalar target cells', () => {
    const result = validateXlsxTemplateMappingStructure({
      schemaVersion: '1.0',
      scalarBindings: [
        {
          kind: 'scalar',
          fieldPath: 'proposal.number',
          sheetName: 'КП',
          cell: 'B2',
        },
        {
          kind: 'scalar',
          fieldPath: 'proposal.title',
          sheetName: 'КП',
          cell: 'b2',
        },
      ],
      tableBindings: [],
    });
    expect(result.ok).toBe(false);
  });

  it('rejects unknown scalar fields', () => {
    const result = validateCommercialProposalXlsxTemplateMapping({
      schemaVersion: '1.0',
      scalarBindings: [
        {
          kind: 'scalar',
          fieldPath: 'proposal.secret',
          sheetName: 'КП',
          cell: 'B2',
        },
      ],
      tableBindings: [],
    });
    expect(result.ok).toBe(false);
  });

  it('rejects workItems tables missing required columns', () => {
    const result = validateCommercialProposalXlsxTemplateMapping({
      schemaVersion: '1.0',
      scalarBindings: [
        {
          kind: 'scalar',
          fieldPath: 'proposal.number',
          sheetName: 'КП',
          cell: 'B2',
        },
      ],
      tableBindings: [
        {
          ...validWorkItemsTable,
          columns: [
            { fieldPath: 'name', cell: 'B15' },
            { fieldPath: 'quantity', cell: 'C15' },
          ],
        },
      ],
    });
    expect(result.ok).toBe(false);
  });

  it('rejects invalid table field paths', () => {
    const result = validateCommercialProposalXlsxTemplateMapping({
      schemaVersion: '1.0',
      scalarBindings: [],
      tableBindings: [
        {
          ...validWorkItemsTable,
          columns: [
            { fieldPath: 'name', cell: 'B15' },
            { fieldPath: 'quantity', cell: 'C15' },
            { fieldPath: 'unitPrice', cell: 'D15' },
            { fieldPath: 'taxRate', cell: 'E15' },
          ],
        },
      ],
    });
    expect(result.ok).toBe(false);
  });
});

describe('payload builder custom template config', () => {
  it('omits templateRenderConfig by default', () => {
    const payload = buildDocumentGenerationPayloadV2({
      aggregate: aggregateFixture(),
      company: { id: '33333333-3333-4333-8333-333333333333', name: 'Acme' },
      now: new Date('2026-07-20T10:00:00+03:00'),
    });
    expect(payload.templateRenderConfig).toBeUndefined();
    expect(payload.templateCode).toBe('mikoton-commercial-proposal');
    expect(payload.templateVersion).toBe('2');
  });

  it('includes templateRenderConfig only when selected', () => {
    const mapping = validateCommercialProposalXlsxTemplateMapping(validMapping);
    expect(mapping.ok).toBe(true);
    if (!mapping.ok) {
      return;
    }

    const payload = buildDocumentGenerationPayloadV2({
      aggregate: aggregateFixture(),
      company: { id: '33333333-3333-4333-8333-333333333333', name: 'Acme' },
      now: new Date('2026-07-20T10:00:00+03:00'),
      templateRenderConfig: {
        templateSource: 'custom-xlsx',
        templateVersionId: '77777777-7777-4777-8777-777777777777',
        templateFile: {
          storageKey: 'xlsx-templates/demo/v1.xlsx',
          sha256: 'a'.repeat(64),
          originalFileName: 'demo.xlsx',
        },
        mapping: mapping.mapping,
      },
    });

    expect(payload.templateRenderConfig?.templateSource).toBe('custom-xlsx');
    expect(payload.templateRenderConfig?.mapping.schemaVersion).toBe('1.0');
  });
});
