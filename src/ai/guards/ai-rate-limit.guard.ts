import {
  CanActivate,
  ExecutionContext,
  HttpException,
  HttpStatus,
  Injectable,
} from '@nestjs/common';
import { Request, Response } from 'express';

@Injectable()
export class AiRateLimitGuard implements CanActivate {
  private readonly rpm: number;
  private readonly windowMs = 60_000;
  private readonly buckets = new Map<string, number[]>();

  constructor() {
    this.rpm = Number(process.env.AI_RATE_LIMIT_RPM ?? 20);
  }

  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest<Request>();
    const response = context.switchToHttp().getResponse<Response>();

    const ip =
      (request.headers['x-forwarded-for'] as string | undefined)
        ?.split(',')[0]
        ?.trim() ??
      request.socket.remoteAddress ??
      'unknown';

    const now = Date.now();
    const cutoff = now - this.windowMs;

    const timestamps = (this.buckets.get(ip) ?? []).filter((t) => t > cutoff);

    if (timestamps.length >= this.rpm) {
      const oldest = timestamps[0];
      const retryAfter = Math.ceil((oldest + this.windowMs - now) / 1000);
      response.setHeader('Retry-After', retryAfter);
      throw new HttpException(
        {
          statusCode: HttpStatus.TOO_MANY_REQUESTS,
          error: 'Too Many Requests',
          message: `AI rate limit exceeded. Retry after ${retryAfter}s.`,
        },
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }

    timestamps.push(now);
    this.buckets.set(ip, timestamps);
    return true;
  }
}
