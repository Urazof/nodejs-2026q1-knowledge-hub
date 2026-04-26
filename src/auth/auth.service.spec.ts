import { describe, it, expect, vi, beforeEach } from 'vitest';
import { BadRequestException, ForbiddenException, UnauthorizedException } from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { UserRole as PrismaUserRole } from '@prisma/client';
import { AuthService } from './auth.service';

vi.mock('bcrypt', () => ({
  hash: vi.fn().mockResolvedValue('hashed'),
  compare: vi.fn(),
}));

const makeDbUser = (overrides = {}) => ({
  id: 'user-1',
  login: 'alice',
  password: 'hashed',
  role: PrismaUserRole.VIEWER,
  createdAt: new Date(),
  updatedAt: new Date(),
  ...overrides,
});

const makeJwt = () => ({
  sign: vi.fn().mockReturnValue('token_value'),
  verify: vi.fn(),
});

const makePrisma = () => ({
  user: {
    findUnique: vi.fn(),
    create: vi.fn(),
  },
});

describe('AuthService', () => {
  let service: AuthService;
  let prisma: ReturnType<typeof makePrisma>;
  let jwt: ReturnType<typeof makeJwt>;

  beforeEach(() => {
    prisma = makePrisma();
    jwt = makeJwt();
    service = new AuthService(prisma as never, jwt as never);
  });

  describe('signup', () => {
    it('creates user and returns id, login, role', async () => {
      prisma.user.findUnique.mockResolvedValue(null);
      prisma.user.create.mockResolvedValue(makeDbUser());

      const result = await service.signup({ login: 'alice', password: 'pass' });
      expect(result.login).toBe('alice');
      expect(result.role).toBe('viewer');
      expect(result).not.toHaveProperty('password');
    });

    it('throws BadRequestException when login is already taken', async () => {
      prisma.user.findUnique.mockResolvedValue(makeDbUser());
      await expect(service.signup({ login: 'alice', password: 'pass' })).rejects.toThrow(
        BadRequestException,
      );
    });
  });

  describe('login', () => {
    it('returns token pair on valid credentials', async () => {
      prisma.user.findUnique.mockResolvedValue(makeDbUser());
      vi.mocked(bcrypt.compare).mockResolvedValue(true as never);

      const result = await service.login({ login: 'alice', password: 'pass' });
      expect(result).toHaveProperty('accessToken');
      expect(result).toHaveProperty('refreshToken');
    });

    it('throws ForbiddenException when user not found', async () => {
      prisma.user.findUnique.mockResolvedValue(null);
      await expect(service.login({ login: 'ghost', password: 'x' })).rejects.toThrow(
        ForbiddenException,
      );
    });

    it('throws ForbiddenException when password does not match', async () => {
      prisma.user.findUnique.mockResolvedValue(makeDbUser());
      vi.mocked(bcrypt.compare).mockResolvedValue(false as never);
      await expect(service.login({ login: 'alice', password: 'wrong' })).rejects.toThrow(
        ForbiddenException,
      );
    });
  });

  describe('refresh', () => {
    it('throws UnauthorizedException when refreshToken is missing', async () => {
      await expect(service.refresh({ refreshToken: undefined })).rejects.toThrow(
        UnauthorizedException,
      );
    });

    it('throws ForbiddenException when token is blacklisted', async () => {
      service.logout({ refreshToken: 'blacklisted_token' });
      await expect(service.refresh({ refreshToken: 'blacklisted_token' })).rejects.toThrow(
        ForbiddenException,
      );
    });

    it('throws ForbiddenException when token is invalid', async () => {
      jwt.verify.mockImplementation(() => {
        throw new Error('jwt malformed');
      });
      await expect(service.refresh({ refreshToken: 'bad_token' })).rejects.toThrow(
        ForbiddenException,
      );
    });

    it('returns new token pair on valid refresh token', async () => {
      jwt.verify.mockReturnValue({ userId: 'user-1', login: 'alice', role: 'viewer' });
      prisma.user.findUnique.mockResolvedValue(makeDbUser());

      const result = await service.refresh({ refreshToken: 'valid_token' });
      expect(result).toHaveProperty('accessToken');
      expect(result).toHaveProperty('refreshToken');
    });

    it('throws ForbiddenException when user no longer exists', async () => {
      jwt.verify.mockReturnValue({ userId: 'user-1', login: 'alice', role: 'viewer' });
      prisma.user.findUnique.mockResolvedValue(null);

      await expect(service.refresh({ refreshToken: 'valid_token' })).rejects.toThrow(
        ForbiddenException,
      );
    });
  });

  describe('logout', () => {
    it('adds refreshToken to blacklist', () => {
      service.logout({ refreshToken: 'some_token' });
      // verify blacklist via refresh rejection
      jwt.verify.mockReturnValue({ userId: 'u1', login: 'a', role: 'viewer' });
      expect(service.refresh({ refreshToken: 'some_token' })).rejects.toThrow(ForbiddenException);
    });

    it('does nothing when refreshToken is absent', () => {
      expect(() => service.logout({})).not.toThrow();
    });
  });
});
