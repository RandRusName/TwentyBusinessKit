import { describe, expect, it } from 'vitest';

import {
  buildMappingFromDrafts,
  collectClientMappingIssues,
  createDefaultScalarBindings,
  createDefaultWorkItemsDraft,
  groupScalarFields,
  validateSelectedXlsxFile,
  validateWorkItemsDraft,
} from 'src/front-components/xlsx-template-builder/builder-helpers';

describe('xlsx template builder helpers', () => {
  it('groups scalar fields by category', () => {
    const groups = groupScalarFields();
    expect(groups.map((group) => group.category)).toEqual([
      'Proposal',
      'Customer',
      'Contractor',
      'Content',
    ]);
    expect(
      groups
        .find((group) => group.category === 'Proposal')
        ?.fields.some((field) => field.path === 'proposal.number'),
    ).toBe(true);
  });

  it('rejects non-xlsx files client-side', () => {
    const file = new File(['abc'], 'demo.xlsm', {
      type: 'application/vnd.ms-excel.sheet.macroEnabled.12',
    });
    expect(validateSelectedXlsxFile(file)?.message).toMatch(/xlsx/i);
  });

  it('builds mapping schema from drafts', () => {
    const scalars = createDefaultScalarBindings('КП').map((binding, index) => ({
      ...binding,
      cell: `B${index + 2}`,
    }));
    const workItems = createDefaultWorkItemsDraft('КП');
    workItems.templateRow = 15;
    workItems.columns = workItems.columns.map((column) => {
      if (column.fieldPath === 'name') {
        return { ...column, enabled: true, cell: 'B15' };
      }
      if (column.fieldPath === 'quantity') {
        return { ...column, enabled: true, cell: 'D15' };
      }
      if (column.fieldPath === 'lineAmount') {
        return { ...column, enabled: true, cell: 'H15' };
      }
      return { ...column, enabled: false, cell: '' };
    });

    const mapping = buildMappingFromDrafts({
      scalarBindings: scalars,
      workItems,
    });

    expect(mapping.schemaVersion).toBe('1.0');
    expect(mapping.scalarBindings[0]?.fieldPath).toBe('proposal.number');
    expect(mapping.tableBindings[0]?.collectionPath).toBe('content.workItems');
    expect(mapping.tableBindings[0]?.columns.map((column) => column.fieldPath)).toEqual([
      'name',
      'quantity',
      'lineAmount',
    ]);
  });

  it('rejects table column cells outside template row', () => {
    const workItems = createDefaultWorkItemsDraft('КП');
    workItems.templateRow = 15;
    workItems.columns = workItems.columns.map((column) => {
      if (column.fieldPath === 'name') {
        return { ...column, enabled: true, cell: 'B16' };
      }
      if (column.fieldPath === 'quantity') {
        return { ...column, enabled: true, cell: 'D15' };
      }
      if (column.fieldPath === 'lineAmount') {
        return { ...column, enabled: true, cell: 'H15' };
      }
      return { ...column, enabled: false, cell: '' };
    });

    const issues = validateWorkItemsDraft(workItems);
    expect(
      issues.some((issue) =>
        issue.message.includes('template row 15'),
      ),
    ).toBe(true);
  });

  it('collects client issues before backend validate', () => {
    const issues = collectClientMappingIssues({
      scalarBindings: [
        {
          id: '1',
          fieldPath: 'proposal.number',
          sheetName: 'КП',
          cell: '15B',
        },
      ],
      workItems: {
        ...createDefaultWorkItemsDraft('КП'),
        enabled: false,
      },
    });
    expect(issues.some((issue) => /A1/.test(issue.message))).toBe(true);
  });
});
