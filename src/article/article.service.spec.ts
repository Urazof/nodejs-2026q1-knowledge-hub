import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  ForbiddenException,
  UnprocessableEntityException,
} from '@nestjs/common';
import { ArticleStatus as PrismaArticleStatus } from '@prisma/client';
import { ArticleService } from './article.service';
import { NotFoundError } from '../common/errors';
import { ArticleStatus } from '../common/enums/article-status.enum';

const makeDbArticle = (overrides = {}) => ({
  id: 'art-1',
  title: 'Hello',
  content: 'World',
  status: PrismaArticleStatus.DRAFT,
  authorId: 'user-1',
  categoryId: null,
  tags: [],
  createdAt: new Date('2026-01-01'),
  updatedAt: new Date('2026-01-01'),
  ...overrides,
});

const makePrisma = () => ({
  article: {
    findMany: vi.fn(),
    findUnique: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
  },
  user: { findUnique: vi.fn() },
  category: { findUnique: vi.fn() },
});

describe('ArticleService', () => {
  let service: ArticleService;
  let prisma: ReturnType<typeof makePrisma>;

  beforeEach(() => {
    prisma = makePrisma();
    service = new ArticleService(prisma as never);
  });

  describe('findAll', () => {
    it('returns all articles as array when no pagination', async () => {
      prisma.article.findMany.mockResolvedValue([makeDbArticle()]);
      const result = await service.findAll({});
      expect(Array.isArray(result)).toBe(true);
    });

    it('returns paginated response when page/limit provided', async () => {
      prisma.article.findMany.mockResolvedValue([makeDbArticle()]);
      const result = await service.findAll({ page: 1, limit: 10 });
      expect(result).toHaveProperty('data');
      expect(result).toHaveProperty('total');
    });
  });

  describe('findOne', () => {
    it('returns mapped article when found', async () => {
      prisma.article.findUnique.mockResolvedValue(makeDbArticle());
      const result = await service.findOne('art-1');
      expect(result.id).toBe('art-1');
      expect(result.tags).toEqual([]);
    });

    it('throws NotFoundError when article does not exist', async () => {
      prisma.article.findUnique.mockResolvedValue(null);
      await expect(service.findOne('missing')).rejects.toBeInstanceOf(NotFoundError);
    });
  });

  describe('create', () => {
    it('creates article with default DRAFT status', async () => {
      prisma.user.findUnique.mockResolvedValue({ id: 'user-1' });
      prisma.article.create.mockResolvedValue(makeDbArticle());

      const result = await service.create({
        title: 'Hello',
        content: 'World',
        authorId: 'user-1',
      });
      expect(result.status).toBe(ArticleStatus.DRAFT);
    });

    it('throws UnprocessableEntityException when authorId does not exist', async () => {
      prisma.user.findUnique.mockResolvedValue(null);
      await expect(
        service.create({ title: 'T', content: 'C', authorId: 'bad-id' }),
      ).rejects.toThrow(UnprocessableEntityException);
    });

    it('throws UnprocessableEntityException when categoryId does not exist', async () => {
      prisma.user.findUnique.mockResolvedValue(null); // skipped (no authorId)
      prisma.category.findUnique.mockResolvedValue(null);
      await expect(
        service.create({ title: 'T', content: 'C', categoryId: 'bad-cat' }),
      ).rejects.toThrow(UnprocessableEntityException);
    });
  });

  describe('update', () => {
    it('allows admin to update any article', async () => {
      prisma.article.findUnique.mockResolvedValue(makeDbArticle({ authorId: 'other-user' }));
      prisma.article.update.mockResolvedValue(makeDbArticle());

      const result = await service.update(
        'art-1',
        { title: 'Updated' },
        { userId: 'admin-id', login: 'admin', role: 'admin' },
      );
      expect(result.id).toBe('art-1');
    });

    it('allows editor to update their own article', async () => {
      prisma.article.findUnique.mockResolvedValue(makeDbArticle({ authorId: 'editor-id' }));
      prisma.article.update.mockResolvedValue(makeDbArticle());

      await expect(
        service.update(
          'art-1',
          { title: 'Mine' },
          { userId: 'editor-id', login: 'editor', role: 'editor' },
        ),
      ).resolves.toBeDefined();
    });

    it('throws ForbiddenException when editor tries to update another author article', async () => {
      prisma.article.findUnique.mockResolvedValue(makeDbArticle({ authorId: 'other-user' }));

      await expect(
        service.update(
          'art-1',
          { title: 'Stolen' },
          { userId: 'editor-id', login: 'editor', role: 'editor' },
        ),
      ).rejects.toThrow(ForbiddenException);
    });

    it('throws NotFoundError when article does not exist', async () => {
      prisma.article.findUnique.mockResolvedValue(null);
      await expect(service.update('missing', {})).rejects.toBeInstanceOf(NotFoundError);
    });
  });

  describe('remove', () => {
    it('deletes article when found', async () => {
      prisma.article.findUnique.mockResolvedValue(makeDbArticle());
      prisma.article.delete.mockResolvedValue(makeDbArticle());
      await expect(service.remove('art-1')).resolves.toBeUndefined();
    });

    it('throws NotFoundError when article does not exist', async () => {
      prisma.article.findUnique.mockResolvedValue(null);
      await expect(service.remove('missing')).rejects.toBeInstanceOf(NotFoundError);
    });
  });
});
