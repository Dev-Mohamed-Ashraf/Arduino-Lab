import { ERROR_CODES, getErrorMessage, type ApiErrorBody, type ErrorCode } from '../errors';

/** Every failed request from the API client rejects with this. */
export class ApiError extends Error {
  readonly code: ErrorCode;
  readonly status: number;
  readonly details?: Record<string, string[]>;

  constructor(code: ErrorCode, message: string, status: number, details?: Record<string, string[]>) {
    super(message);
    this.name = 'ApiError';
    this.code = code;
    this.status = status;
    this.details = details;
  }

  /** Builds an ApiError from a response body, falling back to a generic message. */
  static fromResponse(status: number, body: unknown): ApiError {
    if (isApiErrorBody(body)) {
      return new ApiError(body.code, body.message || getErrorMessage(body.code), status, body.details);
    }
    const code = statusToCode(status);
    return new ApiError(code, getErrorMessage(code), status);
  }

  /** True when the failure is a lost race the user can retry after a refresh. */
  get isConflict(): boolean {
    return this.status === 409;
  }
}

function isApiErrorBody(body: unknown): body is ApiErrorBody {
  return (
    typeof body === 'object' &&
    body !== null &&
    'code' in body &&
    typeof (body as { code: unknown }).code === 'string'
  );
}

function statusToCode(status: number): ErrorCode {
  switch (status) {
    case 400:
      return ERROR_CODES.VALIDATION_FAILED;
    case 401:
      return ERROR_CODES.UNAUTHORIZED;
    case 403:
      return ERROR_CODES.FORBIDDEN;
    case 404:
      return ERROR_CODES.NOT_FOUND;
    case 409:
      return ERROR_CODES.CONFLICT;
    case 429:
      return ERROR_CODES.RATE_LIMITED;
    default:
      return ERROR_CODES.INTERNAL_ERROR;
  }
}
