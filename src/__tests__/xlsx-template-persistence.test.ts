import { describe, expect, it, vi } from 'vitest';

import {
  createPersistedXlsxTemplateVersion,
  validateXlsxTemplateMappingAgainstWorkbook,
  XLSX_TEMPLATE_PERSISTENCE_STATUS,
  type XlsxTemplateRepository,
  type XlsxTemplateVersionDetail,
} from 'src/modules/commercial-proposals';
import type { XlsxTemplateStoragePort } from 'src/modules/documents';
import { ApplicationError } from 'src/modules/foundation';
import { buildDocumentGenerationPayloadV2 } from 'src/domain/commercial-proposal';
import type { CommercialProposalAggregate } from 'src/domain/commercial-proposal-aggregate';

const validMapping = {
  schemaVersion: '1.0' as const,
  scalarBindings: [
    {
      kind: 'scalar' as const,
      fieldPath: 'proposal.number',
      sheetName: 'КП',
      cell: 'B2',
    },
  ],
  tableBindings: [
    {
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
    },
  ],
};

const workbook = {
  sheets: [
    {
      name: 'КП',
      maxRow: 40,
      maxColumn: 10,
      mergedRanges: [] as string[],
      namedRanges: [] as Array<{ name: string; refersTo: string }>,
      tables: [] as Array<{ name: string; ref: string }>,
    },
  ],
};

describe('xlsx template persistence status', () => {
  it('marks persistence as implemented', () => {
    expect(XLSX_TEMPLATE_PERSISTENCE_STATUS).toBe('implemented');
  });
});

describe('validateXlsxTemplateMappingAgainstWorkbook', () => {
  it('warns on unknown sheet in warn mode', () => {
    const result = validateXlsxTemplateMappingAgainstWorkbook({
      mapping: {
        ...validMapping,
        scalarBindings: [
          {
            ...validMapping.scalarBindings[0]!,
            sheetName: 'Missing',
          },
        ],
      },
      workbook,
      mode: 'warn',
    });
    expect(result.ok).toBe(true);
    expect(result.warnings.some((issue) => issue.code === 'UNKNOWN_SHEET')).toBe(
      true,
    );
  });

  it('rejects unknown sheet in strict mode', () => {
    const result = validateXlsxTemplateMappingAgainstWorkbook({
      mapping: {
        ...validMapping,
        scalarBindings: [
          {
            ...validMapping.scalarBindings[0]!,
            sheetName: 'Missing',
          },
        ],
      },
      workbook,
      mode: 'strict',
    });
    expect(result.ok).toBe(false);
    expect(result.issues.some((issue) => issue.code === 'UNKNOWN_SHEET')).toBe(
      true,
    );
  });

  it('rejects vertical merge on template row in strict mode', () => {
    const result = validateXlsxTemplateMappingAgainstWorkbook({
      mapping: validMapping,
      workbook: {
        sheets: [
          {
            ...workbook.sheets[0]!,
            mergedRanges: ['A14:A16'],
          },
        ],
      },
      mode: 'strict',
    });
    expect(result.ok).toBe(false);
    expect(
      result.issues.some(
        (issue) => issue.code === 'VERTICAL_MERGE_ON_TEMPLATE_ROW',
      ),
    ).toBe(true);
  });

  it('rejects column row mismatch', () => {
    const result = validateXlsxTemplateMappingAgainstWorkbook({
      mapping: {
        ...validMapping,
        tableBindings: [
          {
            ...validMapping.tableBindings[0]!,
            columns: [
              { fieldPath: 'name', cell: 'B16' },
              { fieldPath: 'quantity', cell: 'C15' },
              { fieldPath: 'unitPrice', cell: 'D15' },
            ],
          },
        ],
      },
      workbook,
      mode: 'strict',
    });
    expect(result.ok).toBe(false);
    expect(
      result.issues.some((issue) => issue.code === 'COLUMN_ROW_MISMATCH'),
    ).toBe(true);
  });
});

describe('createPersistedXlsxTemplateVersion', () => {
  it('stores binary via storage adapter and persists only storageKey/sha256', async () => {
    const storedKeys: string[] = [];
    const storage: XlsxTemplateStoragePort = {
      storeXlsxTemplate: async () => {
        storedKeys.push('xlsx-templates/demo/v1.xlsx');
        return {
          status: 'success',
          storageKey: 'xlsx-templates/demo/v1.xlsx',
          sha256: 'a'.repeat(64),
          workbook,
        };
      },
    };

    const createVersion = vi.fn(
      async (input): Promise<XlsxTemplateVersionDetail> => ({
        id: 'version-1',
        templateId: 'template-1',
        version: 1,
        status: input.activate ? 'ACTIVE' : 'DRAFT',
        displayName: input.displayName,
        originalFileName: input.originalFileName,
        fileSha256: input.fileSha256,
        storageKey: input.storageKey,
        mappingSchemaVersion: '1.0',
        createdAt: '2026-07-29T00:00:00.000Z',
        activatedAt: input.activate ? '2026-07-29T00:00:00.000Z' : null,
        mapping: input.mapping,
        workbookMetadata: input.workbookMetadata,
      }),
    );

    const repository = {
      createVersion,
      listTemplates: vi.fn(),
      activateVersion: vi.fn(),
      getActiveVersion: vi.fn(),
      getVersion: vi.fn(),
    } satisfies XlsxTemplateRepository;

    const result = await createPersistedXlsxTemplateVersion({
      input: {
        displayName: 'Demo',
        originalFileName: 'demo.xlsx',
        contentBase64: 'UEs=',
        mapping: validMapping,
        activate: false,
      },
      repository,
      storage,
    });

    expect(storedKeys).toEqual(['xlsx-templates/demo/v1.xlsx']);
    expect(createVersion).toHaveBeenCalledWith(
      expect.objectContaining({
        storageKey: 'xlsx-templates/demo/v1.xlsx',
        fileSha256: 'a'.repeat(64),
      }),
    );
    expect(createVersion.mock.calls[0]?.[0]).not.toHaveProperty(
      'contentBase64',
    );
    expect(result.storageKey).toBe('xlsx-templates/demo/v1.xlsx');
  });

  it('rejects invalid mapping before storing', async () => {
    const storage: XlsxTemplateStoragePort = {
      storeXlsxTemplate: async () => {
        throw new Error('should not store');
      },
    };
    const repository = {
      createVersion: vi.fn(),
      listTemplates: vi.fn(),
      activateVersion: vi.fn(),
      getActiveVersion: vi.fn(),
      getVersion: vi.fn(),
    } satisfies XlsxTemplateRepository;

    await expect(
      createPersistedXlsxTemplateVersion({
        input: {
          displayName: 'Demo',
          originalFileName: 'demo.xlsx',
          contentBase64: 'UEs=',
          mapping: { schemaVersion: '1.0', scalarBindings: [], tableBindings: [] },
          activate: false,
        },
        repository,
        storage,
      }),
    ).rejects.toBeInstanceOf(ApplicationError);
    expect(repository.createVersion).not.toHaveBeenCalled();
  });
});

describe('active custom template generation wiring', () => {
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
      amount: 100,
      currencyCode: 'RUB',
      generatedAt: null,
      idempotencyKey: 'idem-1',
      lastError: null,
      opportunityId: '22222222-2222-4222-8222-222222222222',
      companyId: '33333333-3333-4333-8333-333333333333',
      contactName: 'Иван',
      contextAndGoal: 'goal',
      validityDays: 14,
      paymentTerms: 'terms',
      assumptions: 'assumptions',
      nextStep: 'next',
    },
    items: [
      {
        id: 'item-1',
        commercialProposalId: '11111111-1111-4111-8111-111111111111',
        catalogItemId: null,
        clientKey: 'k1',
        position: 1,
        block: 'A',
        name: 'Work',
        description: null,
        quantity: 1,
        unit: 'шт',
        unitPrice: 100,
        discountPercent: 0,
        lineAmount: 100,
        currencyCode: 'RUB',
      },
    ],
    stages: [
      {
        id: 'stage-1',
        commercialProposalId: '11111111-1111-4111-8111-111111111111',
        clientKey: 's1',
        position: 1,
        title: 'Диагностика',
        result: 'Результат',
        duration: '1 день',
        description: null,
      },
    ],
  });

  it('omits templateRenderConfig when no active template', () => {
    const payload = buildDocumentGenerationPayloadV2({
      aggregate: aggregateFixture(),
      company: { id: '33333333-3333-4333-8333-333333333333', name: 'Acme' },
      now: new Date('2026-07-20T10:00:00.000Z'),
    });
    expect(payload.templateRenderConfig).toBeUndefined();
  });

  it('includes templateRenderConfig when provided', () => {
    const payload = buildDocumentGenerationPayloadV2({
      aggregate: aggregateFixture(),
      company: { id: '33333333-3333-4333-8333-333333333333', name: 'Acme' },
      now: new Date('2026-07-20T10:00:00.000Z'),
      templateRenderConfig: {
        templateSource: 'custom-xlsx',
        templateVersionId: 'version-1',
        templateFile: {
          storageKey: 'xlsx-templates/demo/v1.xlsx',
          sha256: 'b'.repeat(64),
          originalFileName: 'demo.xlsx',
        },
        mapping: validMapping,
      },
    });
    expect(payload.templateRenderConfig?.templateSource).toBe('custom-xlsx');
    expect(payload.templateCode).toBe('mikoton-commercial-proposal');
    expect(payload.templateVersion).toBe('2');
  });
});
