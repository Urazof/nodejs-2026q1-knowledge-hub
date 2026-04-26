import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ForbiddenException } from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { UserRole as PrismaUserRole } from '@prisma/client';
import { UserService } from './user.service';
import { NotFoundError } from '../common/errors';

vi.mock('bcrypt', () => ({
  hash: vi.fn().mockResolvedValue('hashed_password'),
  compare: vi.fn(),
}));

const makeUser = (overrides = {}) => ({
  id: 'user-1',
  login: 'alice',
  password: 'hashed_password',
  role: PrismaUserRole.VIEWER,
  createdAt: new Date('2026-01-01'),
  updatedAt: new Date('2026-01-01'),
  ...overrides,
});

const makePrisma = () => ({
  user: {
    findMany: vi.fn(),
    findUnique: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
  },
  article: { updateMany: vi.fn().mockResolvedValue({ count: 0 }) },
  $transaction: vi.fn(),
});

describe('UserService', () => {
  let service: UserService;
  let prisma: ReturnType<typeof makePrisma>;

  beforeEach(() => {
    prisma = makePrisma();
    service = new UserService(prisma as never);
  });

  describe('findAllPublic', () => {
    it('returns all users without password', async () => {
      prisma.user.findMany.mockResolvedValue([makeUser()]);
      const result = await service.findAllPublic();
      expect(Array.isArray(result)).toBe(true);
      const arr = result as Array<{ password?: string }>;
      expect(arr[0]).not.toHaveProperty('password');
    });
  });

  describe('findOnePublic', () => {
    it('returns user without password when found', async () => {
      prisma.user.findUnique.mockResolvedValue(makeUser());
      const result = await service.findOnePublic('user-1');
      expect(result.id).toBe('user-1');
      expect(result).not.toHaveProperty('password');
    });

    it('throws NotFoundError when user does not exist', async () => {
      prisma.user.findUnique.mockResolvedValue(null);
      await expect(service.findOnePublic('missing')).rejects.toBeInstanceOf(NotFoundError);
    });
  });

  describe('create', () => {
    it('hashes password and returns PublicUser', async () => {
      const dbUser = makeUser({ role: PrismaUserRole.VIEWER });
      prisma.user.create.mockResolvedValue(dbUser);
      const result = await service.create({ login: 'alice', password: 'pass123', role: undefined });
      expect(bcrypt.hash).toHaveBeenCalledWith('pass123', expect.any(Number));
      expect(result).not.toHaveProperty('password');
      expect(result.login).toBe('alice');
    });
  });

  describe('updatePassword', () => {
    it('updates password when oldPassword matches', async () => {
      const user = makeUser();
      prisma.user.findUnique.mockResolvedValue(user);
      vi.mocked(bcrypt.compare).mockResolvedValue(true as never);
      prisma.user.update.mockResolvedValue({ ...user, password: 'new_hashed' });

      const result = await service.updatePassword('user-1', {
        oldPassword: 'old',
        newPassword: 'newPass123',
      });
      expect(result).not.toHaveProperty('password');
      expect(prisma.user.update).toHaveBeenCalled();
    });

    it('throws ForbiddenException when oldPassword is wrong', async () => {
      prisma.user.findUnique.mockResolvedValue(makeUser());
      vi.mocked(bcrypt.compare).mockResolvedValue(false as never);

      await expect(
        service.updatePassword('user-1', { oldPassword: 'wrong', newPassword: 'new' }),
      ).rejects.toThrow(ForbiddenException);
    });

    it('throws NotFoundError when user does not exist', async () => {
      prisma.user.findUnique.mockResolvedValue(null);
      await expect(
        service.updatePassword('missing', { oldPassword: 'x', newPassword: 'y' }),
      ).rejects.toBeInstanceOf(NotFoundError);
    });
  });

  describe('remove', () => {
    it('executes transaction to nullify articles then delete user', async () => {
      prisma.$transaction.mockImplementation(async (fn: (tx: unknown) => Promise<void>) => {
        const tx = {
          user: {
            findUnique: vi.fn().mockResolvedValue(makeUser()),
            delete: vi.fn().mockResolvedValue(undefined),
          },
          article: {
            updateMany: vi.fn().mockResolvedValue({ count: 1 }),
          },
        };
        return fn(tx);
      });

      await expect(service.remove('user-1')).resolves.toBeUndefined();
    });

    it('throws NotFoundError inside transaction when user does not exist', async () => {
      prisma.$transaction.mockImplementation(async (fn: (tx: unknown) => Promise<void>) => {
        const tx = {
          user: { findUnique: vi.fn().mockResolvedValue(null) },
          article: { updateMany: vi.fn() },
        };
        return fn(tx);
      });

      await expect(service.remove('missing')).rejects.toBeInstanceOf(NotFoundError);
    });
  });
});
