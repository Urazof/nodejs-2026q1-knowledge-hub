import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  ForbiddenException,
  NotFoundException,
  UnprocessableEntityException,
} from '@nestjs/common';
import { CommentService } from './comment.service';

const makeDbComment = (overrides = {}) => ({
  id: 'cmt-1',
  content: 'Great article',
  articleId: 'art-1',
  authorId: 'user-1',
  createdAt: new Date('2026-01-01'),
  ...overrides,
});

const makePrisma = () => ({
  comment: {
    findMany: vi.fn(),
    findUnique: vi.fn(),
    create: vi.fn(),
    delete: vi.fn(),
  },
  article: { findUnique: vi.fn() },
  user: { findUnique: vi.fn() },
});

describe('CommentService', () => {
  let service: CommentService;
  let prisma: ReturnType<typeof makePrisma>;

  beforeEach(() => {
    prisma = makePrisma();
    service = new CommentService(prisma as never);
  });

  describe('findAll', () => {
    it('returns all comments mapped', async () => {
      prisma.comment.findMany.mockResolvedValue([makeDbComment()]);
      const result = await service.findAll();
      expect(Array.isArray(result)).toBe(true);
      expect(result[0].createdAt).toBeTypeOf('number');
    });
  });

  describe('findByArticleId', () => {
    it('returns filtered comments as array', async () => {
      prisma.comment.findMany.mockResolvedValue([makeDbComment()]);
      const result = await service.findByArticleId({ articleId: 'art-1' });
      expect(Array.isArray(result)).toBe(true);
    });

    it('returns paginated response when page/limit provided', async () => {
      prisma.comment.findMany.mockResolvedValue([makeDbComment()]);
      const result = await service.findByArticleId({
        articleId: 'art-1',
        page: 1,
        limit: 5,
      });
      expect(result).toHaveProperty('total');
    });
  });

  describe('findOne', () => {
    it('returns mapped comment when found', async () => {
      prisma.comment.findUnique.mockResolvedValue(makeDbComment());
      const result = await service.findOne('cmt-1');
      expect(result.id).toBe('cmt-1');
    });

    it('throws NotFoundException when comment not found', async () => {
      prisma.comment.findUnique.mockResolvedValue(null);
      await expect(service.findOne('missing')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('create', () => {
    it('creates comment when article exists', async () => {
      prisma.article.findUnique.mockResolvedValue({ id: 'art-1' });
      prisma.comment.create.mockResolvedValue(makeDbComment());
      const result = await service.create({
        content: 'Nice',
        articleId: 'art-1',
      });
      expect(result.content).toBe('Great article');
    });

    it('throws UnprocessableEntityException when article not found', async () => {
      prisma.article.findUnique.mockResolvedValue(null);
      await expect(
        service.create({ content: 'x', articleId: 'bad-art' }),
      ).rejects.toThrow(UnprocessableEntityException);
    });

    it('throws UnprocessableEntityException when authorId not found', async () => {
      prisma.article.findUnique.mockResolvedValue({ id: 'art-1' });
      prisma.user.findUnique.mockResolvedValue(null);
      await expect(
        service.create({
          content: 'x',
          articleId: 'art-1',
          authorId: 'bad-user',
        }),
      ).rejects.toThrow(UnprocessableEntityException);
    });
  });

  describe('remove', () => {
    it('deletes comment when admin removes any comment', async () => {
      prisma.comment.findUnique.mockResolvedValue(
        makeDbComment({ authorId: 'other' }),
      );
      prisma.comment.delete.mockResolvedValue(undefined);
      await expect(
        service.remove('cmt-1', {
          userId: 'admin',
          login: 'admin',
          role: 'admin',
        }),
      ).resolves.toBeUndefined();
    });

    it('allows editor to delete their own comment', async () => {
      prisma.comment.findUnique.mockResolvedValue(
        makeDbComment({ authorId: 'editor-id' }),
      );
      prisma.comment.delete.mockResolvedValue(undefined);
      await expect(
        service.remove('cmt-1', {
          userId: 'editor-id',
          login: 'ed',
          role: 'editor',
        }),
      ).resolves.toBeUndefined();
    });

    it('throws ForbiddenException when editor tries to delete another user comment', async () => {
      prisma.comment.findUnique.mockResolvedValue(
        makeDbComment({ authorId: 'other-user' }),
      );
      await expect(
        service.remove('cmt-1', {
          userId: 'editor-id',
          login: 'ed',
          role: 'editor',
        }),
      ).rejects.toThrow(ForbiddenException);
    });

    it('throws NotFoundException when comment not found', async () => {
      prisma.comment.findUnique.mockResolvedValue(null);
      await expect(service.remove('missing')).rejects.toThrow(
        NotFoundException,
      );
    });
  });
});
