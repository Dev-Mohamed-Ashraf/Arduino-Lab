import { describe, expect, it } from 'vitest';

import { attachmentHeader, toCsv, type CsvColumn } from './csv';

interface Row {
  name: string;
  quantity: number;
}

const columns: CsvColumn<Row>[] = [
  { header: 'الاسم', value: (row) => row.name },
  { header: 'الكمية', value: (row) => row.quantity },
];

describe('toCsv', () => {
  it('prepends a UTF-8 BOM so Excel reads Arabic correctly', () => {
    const csv = toCsv([], columns);
    expect(csv.charCodeAt(0)).toBe(0xfeff);
  });

  it('uses CRLF line endings', () => {
    const csv = toCsv([{ name: 'Uno', quantity: 3 }], columns);
    expect(csv).toContain('\r\n');
  });

  it('quotes fields containing a comma', () => {
    const csv = toCsv([{ name: 'a, b', quantity: 1 }], columns);
    expect(csv).toContain('"a, b"');
  });

  it('escapes embedded double quotes by doubling them', () => {
    const csv = toCsv([{ name: 'say "hi"', quantity: 1 }], columns);
    expect(csv).toContain('"say ""hi"""');
  });

  it('neutralises formula injection with a leading tab', () => {
    for (const dangerous of ['=1+1', '+1', '-1', '@x']) {
      const csv = toCsv([{ name: dangerous, quantity: 1 }], columns);
      expect(csv).toContain(`\t${dangerous}`);
    }
  });

  it('renders empty cells for null and undefined', () => {
    const csv = toCsv([{ name: null as unknown as string, quantity: 1 }], columns);
    // Strip the BOM (U+FEFF) before splitting; the escape keeps the source free
    // of an invisible character.
    const dataRow = csv.replace(new RegExp('^\\uFEFF'), '').split('\r\n')[1];
    expect(dataRow).toBe(',1');
  });
});

describe('attachmentHeader', () => {
  it('provides both an ASCII fallback and a UTF-8 filename', () => {
    const header = attachmentHeader('تقرير.csv');
    expect(header).toContain('filename="');
    expect(header).toContain("filename*=UTF-8''");
    expect(header).toContain(encodeURIComponent('تقرير.csv'));
  });
});
