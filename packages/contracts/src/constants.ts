/** Business rules shared by every app. Changing a value here changes it everywhere. */

/** Hard cap on students per group, per the lab policy. */
export const MAX_GROUP_MEMBERS = 6;
export const MIN_GROUP_MEMBERS = 1;

/** Default groups allowed per time slot, per day. Admins may override per slot. */
export const DEFAULT_SLOT_CAPACITY = 5;

/** The lab runs on Cairo time; "today" is resolved against this zone. */
export const LAB_TIME_ZONE = 'Africa/Cairo';

export const PROJECT_TITLE_MIN_LENGTH = 3;
export const PROJECT_TITLE_MAX_LENGTH = 120;
export const PROJECT_DESCRIPTION_MIN_LENGTH = 10;
export const PROJECT_DESCRIPTION_MAX_LENGTH = 1000;

export const PASSWORD_MIN_LENGTH = 8;
export const PASSWORD_MAX_LENGTH = 128;

/** ID card upload limits, mirrored in the Cloudinary signature. */
export const ID_CARD_MAX_BYTES = 5 * 1024 * 1024;
export const ID_CARD_ALLOWED_MIME_TYPES = [
  'image/jpeg',
  'image/png',
  'image/webp',
] as const;

/** Below this share of stock a component is flagged as running low. */
export const LOW_STOCK_THRESHOLD_RATIO = 0.25;

export const DEFAULT_PAGE_SIZE = 20;
export const MAX_PAGE_SIZE = 100;
