import { describe, it, expect, vi, beforeEach } from 'vitest';
import { of, throwError } from 'rxjs';
import { HttpException, HttpStatus } from '@nestjs/common';
import { LoggingInterceptor } from './logging.interceptor';

const makeContext = (overrides: Record<string, unknown> = {}) => ({
  switchToHttp: () => ({
    getRequest: () => ({
      method: 'GET',
      url: '/test',
      query: {},
      body: {},
      ...overrides,
    }),
    getResponse: () => ({ statusCode: 200 }),
  }),
});

describe('LoggingInterceptor', () => {
  let interceptor: LoggingInterceptor;
  let logSpy: ReturnType<typeof vi.spyOn>;
  let errorSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    interceptor = new LoggingInterceptor();
    logSpy = vi.spyOn(interceptor['logger'], 'log').mockImplementation(() => undefined);
    errorSpy = vi.spyOn(interceptor['logger'], 'error').mockImplementation(() => undefined);
  });

  it('logs incoming request with method and url', () => {
    const handler = { handle: () => of(null) };
    interceptor.intercept(makeContext() as never, handler as never).subscribe();
    expect(logSpy).toHaveBeenCalledWith(expect.stringContaining('GET /test'));
  });

  it('logs response with status code on success', () =>
    new Promise<void>((resolve) => {
      const handler = { handle: () => of(null) };
      interceptor.intercept(makeContext() as never, handler as never).subscribe({
        complete: () => {
          expect(logSpy).toHaveBeenCalledWith(expect.stringContaining('200'));
          resolve();
        },
      });
    }));

  it('logs error with status code when handler throws HttpException', () =>
    new Promise<void>((resolve) => {
      const ex = new HttpException('Not found', HttpStatus.NOT_FOUND);
      const handler = { handle: () => throwError(() => ex) };
      interceptor.intercept(makeContext() as never, handler as never).subscribe({
        error: () => {
          expect(errorSpy).toHaveBeenCalledWith(expect.stringContaining('404'));
          resolve();
        },
      });
    }));

  it('redacts password field in request body', () => {
    const ctx = makeContext({ body: { login: 'alice', password: 'secret' } });
    const handler = { handle: () => of(null) };
    interceptor.intercept(ctx as never, handler as never).subscribe();
    expect(logSpy).toHaveBeenCalledWith(expect.stringContaining('[REDACTED]'));
    expect(logSpy).toHaveBeenCalledWith(expect.not.stringContaining('secret'));
  });

  it('redacts nested token fields', () => {
    const ctx = makeContext({ body: { data: { accessToken: 'tok123' } } });
    const handler = { handle: () => of(null) };
    interceptor.intercept(ctx as never, handler as never).subscribe();
    expect(logSpy).toHaveBeenCalledWith(expect.stringContaining('[REDACTED]'));
    expect(logSpy).toHaveBeenCalledWith(expect.not.stringContaining('tok123'));
  });
});
