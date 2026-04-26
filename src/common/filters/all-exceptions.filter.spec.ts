import { describe, it, expect, vi, beforeEach } from 'vitest';
import { HttpException, HttpStatus } from '@nestjs/common';
import { AllExceptionsFilter } from './all-exceptions.filter';
import { NotFoundError } from '../errors';

const makeHost = () => {
  const json = vi.fn();
  const status = vi.fn().mockReturnValue({ json });
  return {
    switchToHttp: () => ({ getResponse: () => ({ status }) }),
    status,
    json,
  };
};

describe('AllExceptionsFilter', () => {
  let filter: AllExceptionsFilter;

  beforeEach(() => {
    filter = new AllExceptionsFilter();
    vi.spyOn(filter['logger'], 'error').mockImplementation(() => undefined);
  });

  it('returns correct status and body for HttpException', () => {
    const host = makeHost();
    const ex = new HttpException({ message: 'Not found', statusCode: 404 }, HttpStatus.NOT_FOUND);
    filter.catch(ex, host as never);
    expect(host.status).toHaveBeenCalledWith(404);
  });

  it('returns statusCode from AppError subclass (NotFoundError)', () => {
    const host = makeHost();
    filter.catch(new NotFoundError('Resource missing'), host as never);
    expect(host.status).toHaveBeenCalledWith(404);
    const jsonArg = host.json.mock.calls[0][0] as Record<string, unknown>;
    expect(jsonArg.message).toBe('Resource missing');
  });

  it('returns 500 for unknown errors', () => {
    const host = makeHost();
    filter.catch(new Error('boom'), host as never);
    expect(host.status).toHaveBeenCalledWith(500);
  });

  it('returns 500 for non-Error thrown values', () => {
    const host = makeHost();
    filter.catch('just a string', host as never);
    expect(host.status).toHaveBeenCalledWith(500);
  });
});
