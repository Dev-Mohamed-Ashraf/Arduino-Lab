import { Injectable } from '@nestjs/common';
import { BOOKING_STATUS_LABELS_AR, type ExportQuery } from '@arduino-lab/contracts';

import { formatDateOnly } from '../../common/utils/dates';
import { toCsv, type CsvColumn } from './csv';
import { ReportsService, type BookingReportRow } from './reports.service';

export interface CsvFile {
  filename: string;
  content: string;
}

/** Turns each report into a CSV file Excel can open with Arabic intact. */
@Injectable()
export class ReportExportService {
  constructor(private readonly reports: ReportsService) {}

  async export(query: ExportQuery): Promise<CsvFile> {
    switch (query.type) {
      case 'bookings':
        return this.bookings(query);
      case 'components-usage':
        return this.componentsUsage(query);
      case 'stock':
        return this.stock();
      case 'slot-utilization':
        return this.slotUtilisation(query);
    }
  }

  private async bookings(query: ExportQuery): Promise<CsvFile> {
    const rows = await this.reports.bookingsInRange(query);

    const columns: CsvColumn<BookingReportRow>[] = [
      { header: 'رقم الحجز', value: (row) => row.bookingNumber },
      { header: 'التاريخ', value: (row) => formatDateOnly(row.bookingDate) },
      { header: 'الفترة', value: (row) => row.timeSlot.label },
      { header: 'رقم المجموعة', value: (row) => row.groupNumber },
      { header: 'عدد الطلاب', value: (row) => row.members.length },
      { header: 'أسماء الطلاب', value: (row) => row.members.map((m) => m.fullName).join(' | ') },
      { header: 'اسم المشروع', value: (row) => row.projectTitle },
      { header: 'وصف المشروع', value: (row) => row.projectDescription },
      {
        header: 'المكوّنات',
        value: (row) => row.components.map((c) => `${c.component.name} x${c.quantity}`).join(' | '),
      },
      { header: 'المسؤول', value: (row) => row.owner.fullName },
      { header: 'البريد الإلكتروني', value: (row) => row.owner.email },
      { header: 'الحالة', value: (row) => BOOKING_STATUS_LABELS_AR[row.status] },
      { header: 'تاريخ التسجيل', value: (row) => row.createdAt.toISOString() },
    ];

    return { filename: buildFilename('bookings', query), content: toCsv(rows, columns) };
  }

  private async componentsUsage(query: ExportQuery): Promise<CsvFile> {
    const rows = await this.reports.componentsUsage(query);

    return {
      filename: buildFilename('components-usage', query),
      content: toCsv(rows, [
        { header: 'المكوّن', value: (row) => row.name },
        { header: 'الكود', value: (row) => row.sku },
        { header: 'عدد مرات الطلب', value: (row) => row.timesRequested },
        { header: 'إجمالي الكمية المطلوبة', value: (row) => row.totalQuantityRequested },
        { header: 'الكمية بالمعمل', value: (row) => row.totalQuantity },
        { header: 'الحد لكل مجموعة', value: (row) => row.maxPerBooking },
        { header: 'أعلى طلب في فترة', value: (row) => row.peakSessionDemand },
      ]),
    };
  }

  private async stock(): Promise<CsvFile> {
    const rows = await this.reports.stock();

    return {
      filename: buildFilename('stock'),
      content: toCsv(rows, [
        { header: 'المكوّن', value: (row) => row.name },
        { header: 'الكود', value: (row) => row.sku },
        { header: 'الكمية بالمعمل', value: (row) => row.totalQuantity },
        { header: 'الحد لكل مجموعة', value: (row) => row.maxPerBooking },
        { header: 'أعلى طلب في فترة', value: (row) => row.peakSessionDemand },
      ]),
    };
  }

  private async slotUtilisation(query: ExportQuery): Promise<CsvFile> {
    const rows = await this.reports.slotUtilisation(query);

    return {
      filename: buildFilename('slot-utilization', query),
      content: toCsv(rows, [
        { header: 'الفترة', value: (row) => row.label },
        { header: 'عدد الحجوزات', value: (row) => row.totalBookings },
        { header: 'السعة الإجمالية', value: (row) => row.totalCapacity },
        { header: 'نسبة الإشغال %', value: (row) => row.utilisationPercent },
      ]),
    };
  }
}

function buildFilename(type: string, range?: { from?: string; to?: string }): string {
  const suffix = [range?.from, range?.to].filter(Boolean).join('_to_');
  return `arduino-lab-${type}${suffix ? `-${suffix}` : ''}.csv`;
}
