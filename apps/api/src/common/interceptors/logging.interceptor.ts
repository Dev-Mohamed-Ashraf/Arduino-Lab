import { Injectable, Logger, type CallHandler, type ExecutionContext, type NestInterceptor } from '@nestjs/common';
import type { Request, Response } from 'express';
import { tap, type Observable } from 'rxjs';

/** One line per request: method, path, status, duration. */
@Injectable()
export class LoggingInterceptor implements NestInterceptor {
  private readonly logger = new Logger('HTTP');

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const http = context.switchToHttp();
    const request = http.getRequest<Request>();
    const startedAt = Date.now();

    return next.handle().pipe(
      tap({
        next: () => this.log(request, http.getResponse<Response>().statusCode, startedAt),
        error: (error: unknown) => {
          const status = error instanceof Error && 'status' in error ? Number(error.status) : 500;
          this.log(request, status, startedAt);
        },
      }),
    );
  }

  private log(request: Request, status: number, startedAt: number): void {
    const duration = Date.now() - startedAt;
    const line = `${request.method} ${request.originalUrl} ${status} ${duration}ms`;
    if (status >= 500) this.logger.error(line);
    else if (status >= 400) this.logger.warn(line);
    else this.logger.log(line);
  }
}
