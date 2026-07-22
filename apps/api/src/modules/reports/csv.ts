/**
 * CSV serialisation for Excel.
 *
 * Two details matter for Arabic exports and both are easy to get wrong:
 * the UTF-8 BOM, without which Excel renders every Arabic column as mojibake,
 * and CRLF line endings, which older Excel builds require to split rows.
 */

/** U+FEFF, written as an escape so it stays visible to anyone reading this file. */
const BOM = '\u{FEFF}';

export interface CsvColumn<T> {
  header: string;
  value: (row: T) => string | number | null | undefined;
}

export function toCsv<T>(rows: T[], columns: CsvColumn<T>[]): string {
  const lines = [
    columns.map((column) => escapeCell(column.header)).join(','),
    ...rows.map((row) => columns.map((column) => escapeCell(column.value(row))).join(',')),
  ];

  return BOM + lines.join('\r\n') + '\r\n';
}

function escapeCell(value: string | number | null | undefined): string {
  if (value === null || value === undefined) return '';

  const text = String(value);

  // A leading =, +, - or @ turns the cell into a formula when the file is opened;
  // prefixing a tab neutralises that without changing what the reader sees.
  const safe = /^[=+\-@]/.test(text) ? `\t${text}` : text;

  return /[",\r\n]/.test(safe) ? `"${safe.replace(/"/g, '""')}"` : safe;
}

/** Content-Disposition value with an RFC 5987 fallback for non-ASCII names. */
export function attachmentHeader(filename: string): string {
  const ascii = filename.replace(/[^\x20-\x7E]/g, '_');
  return `attachment; filename="${ascii}"; filename*=UTF-8''${encodeURIComponent(filename)}`;
}
