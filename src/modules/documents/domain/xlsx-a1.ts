const A1_CELL_REGEX = /^\$?([A-Za-z]+)\$?([1-9][0-9]*)$/;

export const isValidXlsxA1Cell = (cell: string): boolean =>
  typeof cell === 'string' && A1_CELL_REGEX.test(cell.trim());

export const parseXlsxA1Cell = (
  cell: string,
): { column: string; row: number } | null => {
  const match = A1_CELL_REGEX.exec(cell.trim());
  if (match === null) {
    return null;
  }

  return {
    column: match[1].toUpperCase(),
    row: Number(match[2]),
  };
};

export const normalizeXlsxA1Cell = (cell: string): string | null => {
  const parsed = parseXlsxA1Cell(cell);
  if (parsed === null) {
    return null;
  }

  return `${parsed.column}${parsed.row}`;
};
