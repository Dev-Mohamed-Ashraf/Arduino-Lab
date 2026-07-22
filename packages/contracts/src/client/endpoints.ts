import type { Paginated } from '../schemas/common.schema';
import type {
  AuthTokens,
  CurrentUser,
  ForgotPasswordInput,
  LoginInput,
  RegisterInput,
  ResetPasswordInput,
  VerifyEmailInput,
} from '../schemas/auth.schema';
import type {
  Booking,
  BookingSummary,
  CreateBookingInput,
  ListBookingsQuery,
  MoveBookingInput,
  UpdateBookingInput,
} from '../schemas/booking.schema';
import type {
  Component,
  CreateComponentInput,
  ListComponentsQuery,
  UpdateComponentInput,
} from '../schemas/component.schema';
import type { Dashboard } from '../schemas/dashboard.schema';
import type {
  ComponentUsageRow,
  DateRangeQuery,
  ExportQuery,
  OverviewStats,
  SlotUtilisationRow,
} from '../schemas/report.schema';
import type { SlotAvailability, TimeSlot, UpdateSlotInput } from '../schemas/slot.schema';
import type { UploadSignature } from '../schemas/upload.schema';
import type { ListUsersQuery, UpdateProfileInput, UpdateUserRoleInput, User } from '../schemas/user.schema';
import type { HttpClient } from './http-client';

const authEndpoints = (http: HttpClient) => ({
  register: (input: RegisterInput) =>
    http.post<{ message: string }>('/auth/register', input, { public: true }),
  login: (input: LoginInput) => http.post<AuthTokens>('/auth/login', input, { public: true }),
  verifyEmail: (input: VerifyEmailInput) =>
    http.post<{ message: string }>('/auth/verify-email', input, { public: true }),
  resendVerification: (email: string) =>
    http.post<{ message: string }>('/auth/resend-verification', { email }, { public: true }),
  forgotPassword: (input: ForgotPasswordInput) =>
    http.post<{ message: string }>('/auth/forgot-password', input, { public: true }),
  resetPassword: (input: ResetPasswordInput) =>
    http.post<{ message: string }>('/auth/reset-password', input, { public: true }),
  logout: (refreshToken: string) => http.post<void>('/auth/logout', { refreshToken }),
  me: () => http.get<CurrentUser>('/auth/me'),
});

const dashboardEndpoints = (http: HttpClient) => ({
  get: (date?: string) => http.get<Dashboard>('/dashboard', { query: { date }, public: true }),
});

const slotEndpoints = (http: HttpClient) => ({
  list: () => http.get<TimeSlot[]>('/slots', { public: true }),
  availability: (date?: string) =>
    http.get<SlotAvailability[]>('/slots/availability', { query: { date }, public: true }),
  update: (id: string, input: UpdateSlotInput) => http.patch<TimeSlot>(`/slots/${id}`, input),
});

const componentEndpoints = (http: HttpClient) => ({
  list: (query: Partial<ListComponentsQuery> = {}) =>
    http.get<Paginated<Component>>('/components', { query, public: true }),
  get: (id: string) => http.get<Component>(`/components/${id}`, { public: true }),
  create: (input: CreateComponentInput) => http.post<Component>('/components', input),
  update: (id: string, input: UpdateComponentInput) =>
    http.patch<Component>(`/components/${id}`, input),
  remove: (id: string) => http.delete<void>(`/components/${id}`),
  bulkCreate: (items: CreateComponentInput[]) =>
    http.post<{ created: number; skipped: number }>('/components/bulk', { items }),
});

const bookingEndpoints = (http: HttpClient) => ({
  create: (input: CreateBookingInput) => http.post<Booking>('/bookings', input),
  mine: () => http.get<BookingSummary[]>('/bookings/mine'),
  getByNumber: (bookingNumber: string) => http.get<Booking>(`/bookings/${bookingNumber}`),
  list: (query: Partial<ListBookingsQuery> = {}) =>
    http.get<Paginated<BookingSummary>>('/bookings', { query }),
  update: (id: string, input: UpdateBookingInput) => http.patch<Booking>(`/bookings/${id}`, input),
  move: (id: string, input: MoveBookingInput) => http.patch<Booking>(`/bookings/${id}/slot`, input),
  cancel: (id: string) => http.delete<void>(`/bookings/${id}`),
});

const userEndpoints = (http: HttpClient) => ({
  list: (query: Partial<ListUsersQuery> = {}) => http.get<Paginated<User>>('/users', { query }),
  updateRole: (id: string, input: UpdateUserRoleInput) =>
    http.patch<User>(`/users/${id}/role`, input),
  updateProfile: (input: UpdateProfileInput) => http.patch<CurrentUser>('/users/me', input),
});

const uploadEndpoints = (http: HttpClient) => ({
  signature: () => http.post<UploadSignature>('/uploads/signature'),
  remove: (publicId: string) => http.delete<void>(`/uploads/${encodeURIComponent(publicId)}`),
});

const reportEndpoints = (http: HttpClient) => ({
  overview: (date?: string) => http.get<OverviewStats>('/reports/overview', { query: { date } }),
  componentsUsage: (query: DateRangeQuery = {}) =>
    http.get<ComponentUsageRow[]>('/reports/components-usage', { query }),
  stock: () => http.get<ComponentUsageRow[]>('/reports/stock'),
  slotUtilisation: (query: DateRangeQuery = {}) =>
    http.get<SlotUtilisationRow[]>('/reports/slot-utilization', { query }),
  /** Returns the download path for a CSV export; the browser navigates to it. */
  exportUrl: (query: ExportQuery) =>
    `/reports/export?${new URLSearchParams(
      Object.entries(query).filter((entry): entry is [string, string] => Boolean(entry[1])),
    ).toString()}`,
});

/**
 * The complete typed API surface.
 *
 * Front-end code must reach the back end only through this object — that is what
 * keeps request and response shapes in sync with the zod schemas above.
 */
export function createApi(http: HttpClient) {
  return {
    auth: authEndpoints(http),
    dashboard: dashboardEndpoints(http),
    slots: slotEndpoints(http),
    components: componentEndpoints(http),
    bookings: bookingEndpoints(http),
    users: userEndpoints(http),
    uploads: uploadEndpoints(http),
    reports: reportEndpoints(http),
  };
}

export type Api = ReturnType<typeof createApi>;
