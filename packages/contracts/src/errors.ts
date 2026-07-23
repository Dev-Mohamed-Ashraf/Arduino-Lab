/**
 * Every business error the API can return.
 *
 * The code is stable and machine-readable; the message is the Arabic string the
 * UI shows. Both live here so the front-end never has to invent its own wording
 * and the back-end never hard-codes a translation.
 */

export const ERROR_CODES = {
  // Auth
  INVALID_CREDENTIALS: 'INVALID_CREDENTIALS',
  EMAIL_ALREADY_REGISTERED: 'EMAIL_ALREADY_REGISTERED',
  EMAIL_DOMAIN_NOT_ALLOWED: 'EMAIL_DOMAIN_NOT_ALLOWED',
  INVALID_TOKEN: 'INVALID_TOKEN',
  TOKEN_EXPIRED: 'TOKEN_EXPIRED',
  TOKEN_ALREADY_USED: 'TOKEN_ALREADY_USED',
  ACCOUNT_DISABLED: 'ACCOUNT_DISABLED',
  UNAUTHORIZED: 'UNAUTHORIZED',
  FORBIDDEN: 'FORBIDDEN',

  // Slots
  SLOT_NOT_FOUND: 'SLOT_NOT_FOUND',
  SLOT_CLOSED: 'SLOT_CLOSED',
  SLOT_FULL: 'SLOT_FULL',
  SLOT_CAPACITY_BELOW_BOOKED: 'SLOT_CAPACITY_BELOW_BOOKED',
  BOOKING_DATE_IN_PAST: 'BOOKING_DATE_IN_PAST',

  // Components
  COMPONENT_NOT_FOUND: 'COMPONENT_NOT_FOUND',
  COMPONENT_INACTIVE: 'COMPONENT_INACTIVE',
  COMPONENT_OUT_OF_STOCK: 'COMPONENT_OUT_OF_STOCK',
  COMPONENT_NAME_TAKEN: 'COMPONENT_NAME_TAKEN',
  COMPONENT_IN_USE: 'COMPONENT_IN_USE',
  TOTAL_BELOW_RESERVED: 'TOTAL_BELOW_RESERVED',

  // Bookings
  BOOKING_NOT_FOUND: 'BOOKING_NOT_FOUND',
  BOOKING_LOCKED: 'BOOKING_LOCKED',
  BOOKING_ALREADY_CANCELLED: 'BOOKING_ALREADY_CANCELLED',
  GROUP_NUMBER_TAKEN: 'GROUP_NUMBER_TAKEN',
  TOO_MANY_MEMBERS: 'TOO_MANY_MEMBERS',

  // Uploads
  FILE_TOO_LARGE: 'FILE_TOO_LARGE',
  UNSUPPORTED_FILE_TYPE: 'UNSUPPORTED_FILE_TYPE',
  UPLOAD_FAILED: 'UPLOAD_FAILED',

  // Generic
  VALIDATION_FAILED: 'VALIDATION_FAILED',
  NOT_FOUND: 'NOT_FOUND',
  CONFLICT: 'CONFLICT',
  RATE_LIMITED: 'RATE_LIMITED',
  INTERNAL_ERROR: 'INTERNAL_ERROR',
} as const;

export type ErrorCode = (typeof ERROR_CODES)[keyof typeof ERROR_CODES];

/** Arabic message shown to the user for each error code. */
export const ERROR_MESSAGES_AR: Record<ErrorCode, string> = {
  INVALID_CREDENTIALS: 'البريد الإلكتروني أو كلمة المرور غير صحيحة.',
  EMAIL_ALREADY_REGISTERED: 'هذا البريد الإلكتروني مسجّل بالفعل.',
  EMAIL_DOMAIN_NOT_ALLOWED: 'يجب استخدام البريد الإلكتروني الجامعي للتسجيل.',
  INVALID_TOKEN: 'الرابط غير صالح.',
  TOKEN_EXPIRED: 'انتهت صلاحية الرابط. اطلب رابطًا جديدًا.',
  TOKEN_ALREADY_USED: 'تم استخدام هذا الرابط من قبل.',
  ACCOUNT_DISABLED: 'تم تعطيل هذا الحساب. تواصل مع إدارة المعمل.',
  UNAUTHORIZED: 'يجب تسجيل الدخول أولًا.',
  FORBIDDEN: 'لا تملك صلاحية تنفيذ هذا الإجراء.',

  SLOT_NOT_FOUND: 'الفترة الزمنية غير موجودة.',
  SLOT_CLOSED: 'هذه الفترة مغلقة حاليًا للحجز.',
  SLOT_FULL: 'اكتمل عدد المجموعات في هذه الفترة. اختر فترة أخرى.',
  SLOT_CAPACITY_BELOW_BOOKED: 'لا يمكن تقليل السعة لأقل من عدد المجموعات المحجوزة بالفعل.',
  BOOKING_DATE_IN_PAST: 'لا يمكن الحجز في تاريخ مضى.',

  COMPONENT_NOT_FOUND: 'المكوّن غير موجود.',
  COMPONENT_INACTIVE: 'هذا المكوّن غير متاح حاليًا.',
  COMPONENT_OUT_OF_STOCK: 'الكمية المطلوبة غير متوفرة من هذا المكوّن.',
  COMPONENT_NAME_TAKEN: 'يوجد مكوّن بنفس الاسم بالفعل.',
  COMPONENT_IN_USE: 'لا يمكن حذف المكوّن لارتباطه بحجوزات قائمة. يمكنك تعطيله بدلًا من ذلك.',
  TOTAL_BELOW_RESERVED: 'لا يمكن تقليل الكمية الكلية لأقل من الكمية المحجوزة حاليًا.',

  BOOKING_NOT_FOUND: 'الحجز غير موجود.',
  BOOKING_LOCKED: 'الحجز مؤكد ومقفول للتعديل. للتعديل تواصل مع إدارة المعمل.',
  BOOKING_ALREADY_CANCELLED: 'هذا الحجز ملغي بالفعل.',
  GROUP_NUMBER_TAKEN: 'رقم المجموعة مستخدم بالفعل في هذه الفترة وهذا اليوم.',
  TOO_MANY_MEMBERS: 'الحد الأقصى لعدد الطلاب في المجموعة هو 6 طلاب.',

  FILE_TOO_LARGE: 'حجم الملف أكبر من الحد المسموح (5 ميجابايت).',
  UNSUPPORTED_FILE_TYPE: 'صيغة الملف غير مدعومة. المسموح: JPG أو PNG أو WEBP.',
  UPLOAD_FAILED: 'فشل رفع الملف. حاول مرة أخرى.',

  VALIDATION_FAILED: 'البيانات المُدخلة غير صحيحة. راجع الحقول المميّزة.',
  NOT_FOUND: 'العنصر المطلوب غير موجود.',
  CONFLICT: 'تعارض في البيانات. حدّث الصفحة وحاول مرة أخرى.',
  RATE_LIMITED: 'عدد المحاولات كبير. انتظر قليلًا ثم حاول مرة أخرى.',
  INTERNAL_ERROR: 'حدث خطأ غير متوقع. حاول مرة أخرى لاحقًا.',
};

export function getErrorMessage(code: string): string {
  return ERROR_MESSAGES_AR[code as ErrorCode] ?? ERROR_MESSAGES_AR.INTERNAL_ERROR;
}

/** Uniform error body produced by the API's exception filter. */
export interface ApiErrorBody {
  code: ErrorCode;
  message: string;
  /** Field-level messages, keyed by dotted path, when validation fails. */
  details?: Record<string, string[]>;
  timestamp: string;
  path: string;
}
