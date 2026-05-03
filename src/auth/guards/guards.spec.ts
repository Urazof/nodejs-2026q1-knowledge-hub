import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ForbiddenException, UnauthorizedException } from '@nestjs/common';
import { JwtAuthGuard } from './jwt-auth.guard';
import { RolesGuard } from './roles.guard';

const makeContext = ({
  handler = {},
  klass = {},
  headers = {},
  user = undefined as unknown,
} = {}) =>
  ({
    getHandler: () => handler,
    getClass: () => klass,
    switchToHttp: () => ({
      getRequest: () => ({ headers, user }),
    }),
  }) as never;

describe('JwtAuthGuard', () => {
  let guard: JwtAuthGuard;
  let jwtService: {
    verify: ReturnType<typeof vi.fn>;
    sign: ReturnType<typeof vi.fn>;
  };
  let reflector: { getAllAndOverride: ReturnType<typeof vi.fn> };

  beforeEach(() => {
    jwtService = { verify: vi.fn(), sign: vi.fn() };
    reflector = { getAllAndOverride: vi.fn().mockReturnValue(false) };
    guard = new JwtAuthGuard(jwtService as never, reflector as never);
  });

  it('passes through @Public() routes without checking token', () => {
    reflector.getAllAndOverride.mockReturnValue(true);
    const ctx = makeContext({ headers: {} });
    expect(guard.canActivate(ctx)).toBe(true);
  });

  it('throws UnauthorizedException when Authorization header is absent', () => {
    const ctx = makeContext({ headers: {} });
    expect(() => guard.canActivate(ctx)).toThrow(UnauthorizedException);
  });

  it('throws UnauthorizedException when header does not start with Bearer', () => {
    const ctx = makeContext({ headers: { authorization: 'Basic abc' } });
    expect(() => guard.canActivate(ctx)).toThrow(UnauthorizedException);
  });

  it('throws UnauthorizedException when token verification fails', () => {
    jwtService.verify.mockImplementation(() => {
      throw new Error('jwt expired');
    });
    const ctx = makeContext({ headers: { authorization: 'Bearer bad_token' } });
    expect(() => guard.canActivate(ctx)).toThrow(UnauthorizedException);
  });

  it('sets request.user and returns true for valid token', () => {
    const payload = { userId: 'u1', login: 'alice', role: 'viewer' };
    jwtService.verify.mockReturnValue(payload);
    const request: Record<string, unknown> = {
      headers: { authorization: 'Bearer good_token' },
    };
    const ctx = {
      getHandler: () => ({}),
      getClass: () => ({}),
      switchToHttp: () => ({ getRequest: () => request }),
    } as never;

    expect(guard.canActivate(ctx)).toBe(true);
    expect(request.user).toEqual(payload);
  });
});

describe('RolesGuard', () => {
  let guard: RolesGuard;
  let reflector: { getAllAndOverride: ReturnType<typeof vi.fn> };

  beforeEach(() => {
    reflector = { getAllAndOverride: vi.fn() };
    guard = new RolesGuard(reflector as never);
  });

  it('allows all requests when no @Roles() decorator present', () => {
    reflector.getAllAndOverride.mockReturnValue(undefined);
    const ctx = makeContext({ user: { role: 'viewer' } });
    expect(guard.canActivate(ctx)).toBe(true);
  });

  it('allows request when user role matches required role', () => {
    reflector.getAllAndOverride.mockReturnValue(['admin']);
    const ctx = makeContext({ user: { role: 'admin' } });
    expect(guard.canActivate(ctx)).toBe(true);
  });

  it('allows request when user has one of multiple required roles', () => {
    reflector.getAllAndOverride.mockReturnValue(['editor', 'admin']);
    const ctx = makeContext({ user: { role: 'editor' } });
    expect(guard.canActivate(ctx)).toBe(true);
  });

  it('throws ForbiddenException when user role is insufficient', () => {
    reflector.getAllAndOverride.mockReturnValue(['admin']);
    const ctx = makeContext({ user: { role: 'viewer' } });
    expect(() => guard.canActivate(ctx)).toThrow(ForbiddenException);
  });

  it('returns false when user is absent from request', () => {
    reflector.getAllAndOverride.mockReturnValue(['admin']);
    const ctx = makeContext({ user: undefined });
    expect(guard.canActivate(ctx)).toBe(false);
  });
});
