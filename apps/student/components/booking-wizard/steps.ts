import type { CreateBookingInput } from '@arduino-lab/contracts';

export interface WizardStep {
  id: string;
  title: string;
  /** Fields validated before the wizard will advance past this step. */
  fields: (keyof CreateBookingInput)[];
}

export const WIZARD_STEPS: WizardStep[] = [
  { id: 'group', title: 'بيانات المجموعة', fields: ['groupNumber'] },
  { id: 'members', title: 'أعضاء المجموعة', fields: ['members'] },
  { id: 'id-card', title: 'صورة البطاقة', fields: ['idCardUrl', 'idCardPublicId'] },
  { id: 'project', title: 'المشروع', fields: ['projectTitle', 'projectDescription'] },
  { id: 'components', title: 'المكوّنات', fields: ['components'] },
  { id: 'slot', title: 'الموعد', fields: ['bookingDate', 'timeSlotId'] },
  { id: 'review', title: 'المراجعة', fields: [] },
];

/** Maps a server-side error code back to the step the user must fix. */
export function stepIndexForErrorCode(code: string): number | null {
  switch (code) {
    case 'GROUP_NUMBER_TAKEN':
      return 0;
    case 'TOO_MANY_MEMBERS':
      return 1;
    case 'COMPONENT_OUT_OF_STOCK':
    case 'COMPONENT_NOT_FOUND':
    case 'COMPONENT_INACTIVE':
      return 4;
    case 'SLOT_FULL':
    case 'SLOT_CLOSED':
    case 'SLOT_NOT_FOUND':
    case 'BOOKING_DATE_IN_PAST':
      return 5;
    default:
      return null;
  }
}
