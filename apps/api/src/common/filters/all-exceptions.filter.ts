import {
  Catch,
  HttpException,
  HttpStatus,
  Logger,
  type ArgumentsHost,
  type ExceptionFilter,
} from '@nestjs/common';
import { ERROR_CODES, getErrorMessage, type ApiErrorBody } from '@arduino-lab/contracts';
import { Prisma } from '@prisma/client';
import type { Request, Response } from 'express';

/**
 * Turns every thrown value into the single error shape the front end parses.
 *
 * Unexpected failures are logged in full but reported generically — Prisma
 * messages leak table and column names.
 */
@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  private readonly logger = new Logger(AllExceptionsFilter.name);

  catch(exception: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    const { status, body } = this.resolve(exception);

    if (status >= HttpStatus.INTERNAL_SERVER_ERROR) {
      this.logger.error(`${request.method} ${request.url} -> ${status}`, exception);
    }

    response.status(status).json({ ...body, timestamp: new Date().toISOString(), path: request.url });
  }

  private resolve(exception: unknown): { status: number; body: Omit<ApiErrorBody, 'timestamp' | 'path'> } {
    if (exception instanceof HttpException) {
      return { status: exception.getStatus(), body: this.fromHttpException(exception) };
    }

    if (exception instanceof Prisma.PrismaClientKnownRequestError) {
      return this.fromPrismaError(exception);
    }

    return {
      status: HttpStatus.INTERNAL_SERVER_ERROR,
      body: {
        code: ERROR_CODES.INTERNAL_ERROR,
        message: getErrorMessage(ERROR_CODES.INTERNAL_ERROR),
      },
    };
  }

  private fromHttpException(exception: HttpException): Omit<ApiErrorBody, 'timestamp' | 'path'> {
    const payload = exception.getResponse();

    if (typeof payload === 'object' && payload !== null && 'code' in payload) {
      const { code, message, details } = payload as Partial<ApiErrorBody>;
      return {
        code: code ?? ERROR_CODES.INTERNAL_ERROR,
        message: message ?? getErrorMessage(code ?? ERROR_CODES.INTERNAL_ERROR),
        ...(details ? { details } : {}),
      };
    }

    // Framework-thrown exceptions (throttler, payload size, 404 route) carry no code.
    const code = STATUS_TO_CODE[exception.getStatus()] ?? ERROR_CODES.INTERNAL_ERROR;
    return { code, message: getErrorMessage(code) };
  }

  private fromPrismaError(
    exception: Prisma.PrismaClientKnownRequestError,
  ): { status: number; body: Omit<ApiErrorBody, 'timestamp' | 'path'> } {
    const code = PRISMA_CODE_MAP[exception.code];

    if (!code) {
      this.logger.error(`Unmapped Prisma error ${exception.code}`, exception);
      return {
        status: HttpStatus.INTERNAL_SERVER_ERROR,
        body: {
          code: ERROR_CODES.INTERNAL_ERROR,
          message: getErrorMessage(ERROR_CODES.INTERNAL_ERROR),
        },
      };
    }

    return {
      status: code === ERROR_CODES.NOT_FOUND ? HttpStatus.NOT_FOUND : HttpStatus.CONFLICT,
      body: { code, message: getErrorMessage(code) },
    };
  }
}

const STATUS_TO_CODE: Record<number, ApiErrorBody['code']> = {
  [HttpStatus.BAD_REQUEST]: ERROR_CODES.VALIDATION_FAILED,
  [HttpStatus.UNAUTHORIZED]: ERROR_CODES.UNAUTHORIZED,
  [HttpStatus.FORBIDDEN]: ERROR_CODES.FORBIDDEN,
  [HttpStatus.NOT_FOUND]: ERROR_CODES.NOT_FOUND,
  [HttpStatus.CONFLICT]: ERROR_CODES.CONFLICT,
  [HttpStatus.TOO_MANY_REQUESTS]: ERROR_CODES.RATE_LIMITED,
  [HttpStatus.PAYLOAD_TOO_LARGE]: ERROR_CODES.FILE_TOO_LARGE,
};

/** https://www.prisma.io/docs/orm/reference/error-reference */
const PRISMA_CODE_MAP: Record<string, ApiErrorBody['code'] | undefined> = {
  P2002: ERROR_CODES.CONFLICT, // unique constraint
  P2003: ERROR_CODES.CONFLICT, // foreign key constraint
  P2025: ERROR_CODES.NOT_FOUND, // record not found
  P2034: ERROR_CODES.CONFLICT, // transaction write conflict / deadlock
};
