import { describe, it, expect } from 'vitest';
import {
  NotFoundError,
  ValidationError,
  UnauthorizedError,
  ForbiddenError,
} from './index';

describe('Custom error classes', () => {
  it('NotFoundError has statusCode 404 and is instance of Error', () => {
    const err = new NotFoundError('not here');
    expect(err.statusCode).toBe(404);
    expect(err).toBeInstanceOf(Error);
    expect(err.message).toBe('not here');
  });

  it('ValidationError has statusCode 400', () => {
    expect(new ValidationError('bad input').statusCode).toBe(400);
  });

  it('UnauthorizedError has statusCode 401', () => {
    expect(new UnauthorizedError('no token').statusCode).toBe(401);
  });

  it('ForbiddenError has statusCode 403', () => {
    expect(new ForbiddenError('denied').statusCode).toBe(403);
  });

  it('error name matches class name', () => {
    expect(new NotFoundError('x').name).toBe('NotFoundError');
  });
});
