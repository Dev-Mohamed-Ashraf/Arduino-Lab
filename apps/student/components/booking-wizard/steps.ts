import type { CreateBookingInput } from '@arduino-lab/contracts';

export interface WizardStep {
  id: string;
  title: string;
  /** Fields validated before the wizard will advance past this step. */
  fields: (keyof CreateBookingInput)[];
}

/**
 * The period is chosen before the components on purpose: stock is per session,
 * so what is available cannot be shown until the student has picked a date and a
 * period. See plans/13-per-slot-stock.md.
 */
export const WIZARD_STEPS: WizardStep[] = [
  { id: 'group', title: 'بيانات المجموعة', fields: ['groupNumber'] },
  { id: 'members', title: 'أعضاء المجموعة', fields: ['members'] },
  { id: 'id-card', title: 'صورة البطاقة', fields: ['idCardUrl', 'idCardPublicId'] },
  { id: 'project', title: 'المشروع', fields: ['projectTitle', 'projectDescription'] },
  { id: 'slot', title: 'الموعد', fields: ['bookingDate', 'timeSlotId'] },
  { id: 'components', title: 'المكوّنات', fields: ['components'] },
  { id: 'review', title: 'المراجعة', fields: [] },
];

/** Maps a server-side error code back to the step the user must fix. */
export function stepIndexForErrorCode(code: string): number | null {
  switch (code) {
    case 'GROUP_NUMBER_TAKEN':
      return 0;
    case 'TOO_MANY_MEMBERS':
      return 1;
    case 'SLOT_FULL':
    case 'SLOT_CLOSED':
    case 'SLOT_NOT_FOUND':
    case 'BOOKING_DATE_IN_PAST':
      return 4;
    case 'COMPONENT_OUT_OF_STOCK':
    case 'COMPONENT_EXCEEDS_LIMIT':
    case 'COMPONENT_NOT_FOUND':
    case 'COMPONENT_INACTIVE':
      return 5;
    default:
      return null;
  }
}
