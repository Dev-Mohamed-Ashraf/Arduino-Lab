import type { Booking, BookingSummary } from '@arduino-lab/contracts';
import type { Prisma } from '@prisma/client';

import { formatDateOnly } from '../../common/utils/dates';

export const BOOKING_DETAIL_INCLUDE = {
  timeSlot: { select: { id: true, label: true, startTime: true, endTime: true } },
  owner: { select: { id: true, fullName: true, email: true } },
  members: { orderBy: { sortOrder: 'asc' } },
  components: {
    include: { component: { select: { name: true, sku: true } } },
    orderBy: { component: { name: 'asc' } },
  },
} as const satisfies Prisma.BookingInclude;

export const BOOKING_SUMMARY_INCLUDE = {
  timeSlot: { select: { id: true, label: true, startTime: true, endTime: true } },
  owner: { select: { fullName: true } },
  _count: { select: { members: true, components: true } },
} as const satisfies Prisma.BookingInclude;

type BookingDetailRow = Prisma.BookingGetPayload<{ include: typeof BOOKING_DETAIL_INCLUDE }>;
type BookingSummaryRow = Prisma.BookingGetPayload<{ include: typeof BOOKING_SUMMARY_INCLUDE }>;

export function toBookingDto(row: BookingDetailRow): Booking {
  return {
    id: row.id,
    bookingNumber: row.bookingNumber,
    groupNumber: row.groupNumber,
    projectTitle: row.projectTitle,
    projectDescription: row.projectDescription,
    bookingDate: formatDateOnly(row.bookingDate),
    status: row.status,
    notes: row.notes,
    idCardUrl: row.idCardUrl,
    timeSlot: row.timeSlot,
    owner: row.owner,
    members: row.members.map((member) => ({
      id: member.id,
      fullName: member.fullName,
      studentCode: member.studentCode,
      sortOrder: member.sortOrder,
    })),
    components: row.components.map((item) => ({
      id: item.id,
      componentId: item.componentId,
      name: item.component.name,
      sku: item.component.sku,
      quantity: item.quantity,
    })),
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

export function toBookingSummaryDto(row: BookingSummaryRow): BookingSummary {
  return {
    id: row.id,
    bookingNumber: row.bookingNumber,
    groupNumber: row.groupNumber,
    projectTitle: row.projectTitle,
    bookingDate: formatDateOnly(row.bookingDate),
    status: row.status,
    timeSlot: row.timeSlot,
    memberCount: row._count.members,
    componentCount: row._count.components,
    ownerName: row.owner.fullName,
    createdAt: row.createdAt.toISOString(),
  };
}
