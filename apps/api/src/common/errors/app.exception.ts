import { HttpException, HttpStatus } from '@nestjs/common';
import { ERROR_CODES, getErrorMessage, type ErrorCode } from '@arduino-lab/contracts';

/**
 * Business failure with a stable code.
 *
 * The Arabic message is looked up from the shared catalogue so the wording lives
 * in exactly one place and the front end never has to translate a code itself.
 */
export class AppException extends HttpException {
  readonly code: ErrorCode;

  constructor(code: ErrorCode, status: HttpStatus, details?: Record<string, string[]>) {
    super({ code, message: getErrorMessage(code), details }, status);
    this.code = code;
  }
}

export class BadRequestError extends AppException {
  constructor(code: ErrorCode = ERROR_CODES.VALIDATION_FAILED, details?: Record<string, string[]>) {
    super(code, HttpStatus.BAD_REQUEST, details);
  }
}

export class UnauthorizedError extends AppException {
  constructor(code: ErrorCode = ERROR_CODES.UNAUTHORIZED) {
    super(code, HttpStatus.UNAUTHORIZED);
  }
}

export class ForbiddenError extends AppException {
  constructor(code: ErrorCode = ERROR_CODES.FORBIDDEN) {
    super(code, HttpStatus.FORBIDDEN);
  }
}

export class NotFoundError extends AppException {
  constructor(code: ErrorCode = ERROR_CODES.NOT_FOUND) {
    super(code, HttpStatus.NOT_FOUND);
  }
}

/**
 * A lost race or a violated invariant. Always retryable after the client
 * refreshes its view of the data.
 */
export class ConflictError extends AppException {
  constructor(code: ErrorCode = ERROR_CODES.CONFLICT, details?: Record<string, string[]>) {
    super(code, HttpStatus.CONFLICT, details);
  }
}
