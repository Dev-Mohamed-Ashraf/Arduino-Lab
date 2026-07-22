import { Injectable, type PipeTransform } from '@nestjs/common';
import { ERROR_CODES } from '@arduino-lab/contracts';
import type { ZodSchema } from 'zod';

import { BadRequestError } from '../errors/app.exception';

/**
 * Parses a request payload with a shared zod schema.
 *
 * Field errors are returned keyed by dotted path so react-hook-form can attach
 * each message to the input it belongs to.
 */
@Injectable()
export class ZodValidationPipe<T> implements PipeTransform<unknown, T> {
  constructor(private readonly schema: ZodSchema<T>) {}

  transform(value: unknown): T {
    const result = this.schema.safeParse(value);

    if (result.success) {
      return result.data;
    }

    const details: Record<string, string[]> = {};
    for (const issue of result.error.issues) {
      const key = issue.path.join('.') || '_';
      (details[key] ??= []).push(issue.message);
    }

    throw new BadRequestError(ERROR_CODES.VALIDATION_FAILED, details);
  }
}

/** Convenience factory so controllers read as `@Body(zodBody(schema))`. */
export function zodBody<T>(schema: ZodSchema<T>): ZodValidationPipe<T> {
  return new ZodValidationPipe(schema);
}

/** Same pipe, named for query strings to keep controller intent obvious. */
export function zodQuery<T>(schema: ZodSchema<T>): ZodValidationPipe<T> {
  return new ZodValidationPipe(schema);
}
