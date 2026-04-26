import {
  CallHandler,
  ExecutionContext,
  HttpException,
  Injectable,
  Logger,
  NestInterceptor,
} from '@nestjs/common';
import { Request, Response } from 'express';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';

const SENSITIVE_KEYS = new Set(['password', 'token', 'accesstoken', 'refreshtoken', 'authorization']);

function sanitize(value: unknown): unknown {
  if (value === null || typeof value !== 'object') return value;
  if (Array.isArray(value)) return value.map(sanitize);

  const result: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
    result[k] = SENSITIVE_KEYS.has(k.toLowerCase()) ? '[REDACTED]' : sanitize(v);
  }
  return result;
}

@Injectable()
export class LoggingInterceptor implements NestInterceptor {
  private readonly logger = new Logger(LoggingInterceptor.name);

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const request = context
      .switchToHttp()
      .getRequest<Request & { query: Record<string, unknown>; body: unknown }>();

    const { method, url, query, body } = request;
    const startedAt = Date.now();

    this.logger.log(
      `--> ${method} ${url} query=${JSON.stringify(query)} body=${JSON.stringify(sanitize(body))}`,
    );

    return next.handle().pipe(
      tap({
        next: () => {
          const res = context.switchToHttp().getResponse<Response>();
          const elapsed = Date.now() - startedAt;
          this.logger.log(
            `<-- ${method} ${url} ${res.statusCode} ${elapsed}ms`,
          );
        },
        error: (err: unknown) => {
          const elapsed = Date.now() - startedAt;
          const status =
            err instanceof HttpException ? err.getStatus() : 500;
          this.logger.error(
            `<-- ${method} ${url} ${status} ${elapsed}ms`,
          );
        },
      }),
    );
  }
}
