import type { CSSProperties } from 'react';

import type { XlsxSheetMetadata } from 'src/modules/documents';
import {
  get_column_letter_from_index,
  type SpreadsheetHighlight,
} from 'src/front-components/xlsx-template-builder/preview-helpers';

export type SpreadsheetPreviewProps = {
  sheet: XlsxSheetMetadata;
  colorScheme: 'light' | 'dark';
  selectedCell?: string | null;
  highlightedCells?: Record<string, SpreadsheetHighlight>;
  selectedRow?: number | null;
  tableTemplateRow?: number | null;
  onCellClick?: (cell: {
    row: number;
    column: number;
    address: string;
  }) => void;
  onRowClick?: (row: number) => void;
};

const cellMapFromPreview = (sheet: XlsxSheetMetadata) => {
  const map = new Map<
    string,
    {
      displayValue: string;
      hasFormula: boolean;
      isMerged: boolean;
    }
  >();
  for (const cell of sheet.preview?.cells ?? []) {
    map.set(cell.address, {
      displayValue: cell.displayValue,
      hasFormula: cell.hasFormula,
      isMerged: cell.isMerged,
    });
  }
  return map;
};

export const SpreadsheetPreview = ({
  sheet,
  colorScheme,
  selectedCell = null,
  highlightedCells = {},
  selectedRow = null,
  tableTemplateRow = null,
  onCellClick,
  onRowClick,
}: SpreadsheetPreviewProps) => {
  const isDark = colorScheme === 'dark';
  const rowLimit = sheet.preview?.rowLimit ?? Math.min(sheet.maxRow, 80);
  const columnLimit =
    sheet.preview?.columnLimit ?? Math.min(sheet.maxColumn, 30);
  const cells = cellMapFromPreview(sheet);

  const styles = {
    wrap: {
      border: `1px solid ${isDark ? '#374151' : '#e5e7eb'}`,
      borderRadius: 8,
      overflow: 'auto',
      maxHeight: 360,
      background: isDark ? '#0b1220' : '#ffffff',
    } satisfies CSSProperties,
    table: {
      borderCollapse: 'collapse',
      fontSize: 11,
      minWidth: '100%',
    } satisfies CSSProperties,
    corner: {
      position: 'sticky',
      top: 0,
      left: 0,
      zIndex: 3,
      background: isDark ? '#111827' : '#f3f4f6',
      border: `1px solid ${isDark ? '#374151' : '#e5e7eb'}`,
      padding: '4px 6px',
      minWidth: 36,
    } satisfies CSSProperties,
    colHeader: {
      position: 'sticky',
      top: 0,
      zIndex: 2,
      background: isDark ? '#111827' : '#f3f4f6',
      border: `1px solid ${isDark ? '#374151' : '#e5e7eb'}`,
      padding: '4px 6px',
      textAlign: 'center',
      color: isDark ? '#9ca3af' : '#6b7280',
      minWidth: 72,
    } satisfies CSSProperties,
    rowHeader: {
      position: 'sticky',
      left: 0,
      zIndex: 1,
      background: isDark ? '#111827' : '#f3f4f6',
      border: `1px solid ${isDark ? '#374151' : '#e5e7eb'}`,
      padding: 0,
      textAlign: 'center',
      color: isDark ? '#9ca3af' : '#6b7280',
      minWidth: 36,
    } satisfies CSSProperties,
    rowButton: {
      width: '100%',
      border: 'none',
      background: 'transparent',
      color: 'inherit',
      cursor: onRowClick ? 'pointer' : 'default',
      padding: '4px 6px',
      font: 'inherit',
    } satisfies CSSProperties,
    cellButton: {
      width: '100%',
      minHeight: 28,
      border: 'none',
      background: 'transparent',
      color: isDark ? '#f9fafb' : '#111827',
      cursor: onCellClick ? 'pointer' : 'default',
      padding: '4px 6px',
      textAlign: 'left',
      font: 'inherit',
      overflow: 'hidden',
      textOverflow: 'ellipsis',
      whiteSpace: 'nowrap',
    } satisfies CSSProperties,
    td: {
      border: `1px solid ${isDark ? '#1f2937' : '#e5e7eb'}`,
      padding: 0,
      verticalAlign: 'top',
      maxWidth: 140,
    } satisfies CSSProperties,
  };

  const rows = Array.from({ length: rowLimit }, (_, index) => index + 1);
  const columns = Array.from({ length: columnLimit }, (_, index) => index + 1);

  return (
    <div style={styles.wrap}>
      <table style={styles.table}>
        <thead>
          <tr>
            <th style={styles.corner} />
            {columns.map((column) => (
              <th key={column} style={styles.colHeader}>
                {get_column_letter_from_index(column)}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => {
            const isTemplateRow = tableTemplateRow === row;
            const isSelectedRow = selectedRow === row;
            return (
              <tr key={row}>
                <th style={styles.rowHeader}>
                  <button
                    type="button"
                    style={{
                      ...styles.rowButton,
                      background:
                        isTemplateRow || isSelectedRow
                          ? isDark
                            ? '#1e3a8a'
                            : '#dbeafe'
                          : 'transparent',
                    }}
                    aria-label={`Select row ${row} as table template row`}
                    onClick={() => onRowClick?.(row)}
                  >
                    {row}
                  </button>
                </th>
                {columns.map((column) => {
                  const address = `${get_column_letter_from_index(column)}${row}`;
                  const preview = cells.get(address);
                  const highlight = highlightedCells[address];
                  const selected = selectedCell === address;
                  let background = 'transparent';
                  if (isTemplateRow) {
                    background = isDark ? '#111827' : '#eff6ff';
                  }
                  if (highlight?.kind === 'scalar') {
                    background = isDark ? '#14532d' : '#dcfce7';
                  }
                  if (highlight?.kind === 'table') {
                    background = isDark ? '#1e3a8a' : '#dbeafe';
                  }
                  if (highlight?.status === 'error') {
                    background = isDark ? '#7f1d1d' : '#fee2e2';
                  }
                  if (highlight?.status === 'warning') {
                    background = isDark ? '#854d0e' : '#fef3c7';
                  }
                  if (selected) {
                    background = isDark ? '#312e81' : '#c7d2fe';
                  }

                  const markers: string[] = [];
                  if (preview?.hasFormula) markers.push('ƒ');
                  if (preview?.isMerged) markers.push('⧉');
                  if (highlight) markers.push('•');

                  return (
                    <td key={address} style={{ ...styles.td, background }}>
                      <button
                        type="button"
                        style={styles.cellButton}
                        aria-label={`Cell ${address}, value: ${
                          preview?.displayValue || 'empty'
                        }${highlight ? `, mapped: ${highlight.label}` : ''}`}
                        title={
                          [
                            address,
                            preview?.displayValue || '(empty)',
                            highlight?.label,
                            preview?.hasFormula ? 'formula' : null,
                            preview?.isMerged ? 'merged' : null,
                          ]
                            .filter(Boolean)
                            .join(' · ')
                        }
                        onClick={() =>
                          onCellClick?.({ row, column, address })
                        }
                      >
                        {markers.length > 0 ? `${markers.join('')} ` : ''}
                        {preview?.displayValue ?? ''}
                      </button>
                    </td>
                  );
                })}
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
};
