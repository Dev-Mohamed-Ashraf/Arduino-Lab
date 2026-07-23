/**
 * Initial lab data.
 *
 * Component names stay in English because that is how the parts are labelled on
 * the shelves and in every datasheet; the Arabic description is what the UI
 * shows alongside them.
 */

export interface TimeSlotSeed {
  label: string;
  startTime: string;
  endTime: string;
  sortOrder: number;
  capacity: number;
}

export interface ComponentSeed {
  name: string;
  sku: string;
  description: string;
  totalQuantity: number;
}

/** The four fixed lab periods, 11:00 to 15:00. */
export const TIME_SLOTS: TimeSlotSeed[] = [
  { label: '11:00 - 12:00', startTime: '11:00', endTime: '12:00', sortOrder: 1, capacity: 5 },
  { label: '12:00 - 13:00', startTime: '12:00', endTime: '13:00', sortOrder: 2, capacity: 5 },
  { label: '13:00 - 14:00', startTime: '13:00', endTime: '14:00', sortOrder: 3, capacity: 5 },
  { label: '14:00 - 15:00', startTime: '14:00', endTime: '15:00', sortOrder: 4, capacity: 5 },
];

/**
 * Intentionally empty: the lab's real inventory is entered by an admin from the
 * dashboard, with the quantities actually on the shelves.
 * See plans/12-remove-email-verification.md.
 */
export const COMPONENTS: ComponentSeed[] = [];
