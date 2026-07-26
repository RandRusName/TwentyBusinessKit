import { describe, expect, it } from 'vitest';

import {
  createDefaultScalarBindings,
  createDefaultWorkItemsDraft,
} from 'src/front-components/xlsx-template-builder/builder-helpers';
import {
  buildMappingHighlights,
  describePickerMode,
  get_column_letter_from_index,
  resolveSingleCellNamedRange,
  sheetHasPreview,
} from 'src/front-components/xlsx-template-builder/preview-helpers';
import type { XlsxSheetMetadata } from 'src/modules/documents';

const sheetFixture = (): XlsxSheetMetadata => ({
  name: 'КП',
  maxRow: 40,
  maxColumn: 10,
  mergedRanges: ['A5:B5'],
  namedRanges: [{ name: 'TitleCell', refersTo: 'КП!$B$2' }],
  preview: {
    rowLimit: 40,
    columnLimit: 10,
    cells: [
      {
        row: 2,
        column: 2,
        address: 'B2',
        value: 'n',
        displayValue: 'n',
        hasFormula: false,
        isMerged: false,
      },
    ],
  },
});

describe('xlsx template preview helpers', () => {
  it('converts column indexes to letters', () => {
    expect(get_column_letter_from_index(1)).toBe('A');
    expect(get_column_letter_from_index(26)).toBe('Z');
    expect(get_column_letter_from_index(27)).toBe('AA');
  });

  it('detects preview availability', () => {
    expect(sheetHasPreview(sheetFixture())).toBe(true);
    expect(
      sheetHasPreview({
        name: 'КП',
        maxRow: 1,
        maxColumn: 1,
        mergedRanges: [],
        namedRanges: [],
      }),
    ).toBe(false);
  });

  it('resolves single-cell named ranges', () => {
    expect(resolveSingleCellNamedRange("='КП'!$B$2")).toEqual({
      sheetName: 'КП',
      cell: 'B2',
    });
    expect(resolveSingleCellNamedRange('A1:B2')).toBeNull();
  });

  it('highlights scalar and table cells and reports conflicts', () => {
    const scalars = createDefaultScalarBindings('КП').map((binding, index) => ({
      ...binding,
      cell: index === 0 ? 'B2' : index === 1 ? 'B2' : `C${index + 2}`,
    }));
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

    const result = buildMappingHighlights({
      sheetName: 'КП',
      scalarBindings: scalars,
      workItems,
      sheet: sheetFixture(),
    });

    expect(result.highlightedCells.B2?.status).toBe('error');
    expect(
      result.warnings.some((warning) => warning.includes('Duplicate target cell')),
    ).toBe(true);
    expect(
      result.warnings.some((warning) =>
        warning.includes('not on template row 15'),
      ),
    ).toBe(true);
  });

  it('describes picker modes', () => {
    expect(describePickerMode({ kind: 'none' })).toBeNull();
    expect(describePickerMode({ kind: 'scalar', bindingIndex: 0 })).toMatch(
      /scalar binding #1/,
    );
    expect(
      describePickerMode({ kind: 'workItemsTemplateRow' }),
    ).toMatch(/template row/);
  });
});
