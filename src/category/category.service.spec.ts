import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NotFoundException } from '@nestjs/common';
import { CategoryService } from './category.service';

const makeCat = (overrides = {}) => ({
  id: 'cat-1',
  name: 'Tech',
  description: 'Technology articles',
  ...overrides,
});

const makePrisma = () => ({
  category: {
    findMany: vi.fn(),
    findUnique: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
  },
});

describe('CategoryService', () => {
  let service: CategoryService;
  let prisma: ReturnType<typeof makePrisma>;

  beforeEach(() => {
    prisma = makePrisma();
    service = new CategoryService(prisma as never);
  });

  describe('findAll', () => {
    it('returns categories as array without pagination', async () => {
      prisma.category.findMany.mockResolvedValue([makeCat()]);
      const result = await service.findAll();
      expect(Array.isArray(result)).toBe(true);
    });

    it('returns paginated response when page/limit provided', async () => {
      prisma.category.findMany.mockResolvedValue([makeCat()]);
      const result = await service.findAll({ page: 1, limit: 5 });
      expect(result).toHaveProperty('total');
    });
  });

  describe('findOne', () => {
    it('returns category when found', async () => {
      prisma.category.findUnique.mockResolvedValue(makeCat());
      const result = await service.findOne('cat-1');
      expect(result.id).toBe('cat-1');
    });

    it('throws NotFoundException when category not found', async () => {
      prisma.category.findUnique.mockResolvedValue(null);
      await expect(service.findOne('missing')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('create', () => {
    it('creates and returns category', async () => {
      prisma.category.create.mockResolvedValue(makeCat());
      const result = await service.create({
        name: 'Tech',
        description: 'Desc',
      });
      expect(result.name).toBe('Tech');
    });
  });

  describe('update', () => {
    it('updates category when found', async () => {
      prisma.category.findUnique.mockResolvedValue(makeCat());
      prisma.category.update.mockResolvedValue({
        ...makeCat(),
        name: 'Updated',
      });
      const result = await service.update('cat-1', { name: 'Updated' });
      expect(result.name).toBe('Updated');
    });

    it('throws NotFoundException when category not found', async () => {
      prisma.category.findUnique.mockResolvedValue(null);
      await expect(service.update('missing', { name: 'X' })).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('remove', () => {
    it('deletes category when found', async () => {
      prisma.category.findUnique.mockResolvedValue(makeCat());
      prisma.category.delete.mockResolvedValue(makeCat());
      await expect(service.remove('cat-1')).resolves.toBeUndefined();
    });

    it('throws NotFoundException when category not found', async () => {
      prisma.category.findUnique.mockResolvedValue(null);
      await expect(service.remove('missing')).rejects.toThrow(
        NotFoundException,
      );
    });
  });
});
