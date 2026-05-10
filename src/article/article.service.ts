import {
  ForbiddenException,
  Injectable,
  UnprocessableEntityException,
} from '@nestjs/common';
import { NotFoundError } from '../common/errors';
import { ArticleStatus as PrismaArticleStatus, Prisma } from '@prisma/client';
import { JwtUser } from '../auth/decorators/current-user.decorator';
import { ArticleStatus } from '../common/enums/article-status.enum';
import { Article } from '../common/models/article.model';
import { PaginatedResponse } from '../common/models/paginated-response.model';
import {
  paginateItems,
  shouldPaginate,
  sortItems,
} from '../common/utils/list-query.util';
import { PrismaService } from '../prisma/prisma.service';
import { ArticleFilterQueryDto } from './dto/article-filter-query.dto';
import { CreateArticleDto } from './dto/create-article.dto';
import { UpdateArticleDto } from './dto/update-article.dto';

@Injectable()
export class ArticleService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(
    filters: ArticleFilterQueryDto = {},
  ): Promise<Article[] | PaginatedResponse<Article>> {
    const where: Prisma.ArticleWhereInput = {};

    if (filters.status) {
      where.status = this.toPrismaArticleStatus(filters.status);
    }

    if (filters.categoryId) {
      where.categoryId = filters.categoryId;
    }

    if (filters.tag) {
      where.tags = { some: { name: filters.tag } };
    }

    const filtered = (
      await this.prisma.article.findMany({
        where,
        include: {
          tags: {
            select: {
              name: true,
            },
          },
        },
      })
    ).map((article) => this.mapPrismaArticle(article));

    const sorted = sortItems(filtered, filters.sortBy, filters.order ?? 'asc', [
      'id',
      'title',
      'content',
      'status',
      'authorId',
      'categoryId',
      'createdAt',
      'updatedAt',
    ]);

    if (shouldPaginate(filters)) {
      return paginateItems(sorted, filters.page ?? 1, filters.limit ?? 10);
    }

    return sorted;
  }

  async findOne(id: string): Promise<Article> {
    return this.findOneOrThrow(id);
  }

  async create(payload: CreateArticleDto): Promise<Article> {
    await this.validateRelations(payload.authorId, payload.categoryId);

    const article = await this.prisma.article.create({
      data: {
        title: payload.title,
        content: payload.content,
        status: this.toPrismaArticleStatus(
          payload.status ?? ArticleStatus.DRAFT,
        ),
        authorId: payload.authorId ?? null,
        categoryId: payload.categoryId ?? null,
        tags: {
          connectOrCreate: this.toTagConnectOrCreate(payload.tags),
        },
      },
      include: {
        tags: {
          select: {
            name: true,
          },
        },
      },
    });

    return this.mapPrismaArticle(article);
  }

  async update(
    id: string,
    payload: UpdateArticleDto,
    currentUser?: JwtUser,
  ): Promise<Article> {
    const existing = await this.findOneOrThrow(id);

    if (
      currentUser?.role === 'editor' &&
      existing.authorId !== currentUser.userId
    ) {
      throw new ForbiddenException('You can only update your own articles');
    }

    if (payload.authorId !== undefined || payload.categoryId !== undefined) {
      await this.validateRelations(payload.authorId, payload.categoryId);
    }

    const updateData: Prisma.ArticleUpdateInput = {
      ...(payload.title !== undefined && { title: payload.title }),
      ...(payload.content !== undefined && { content: payload.content }),
      ...(payload.status !== undefined && {
        status: this.toPrismaArticleStatus(payload.status),
      }),
      ...(payload.authorId !== undefined && { authorId: payload.authorId }),
      ...(payload.categoryId !== undefined && {
        categoryId: payload.categoryId,
      }),
    };

    if (payload.tags !== undefined) {
      updateData.tags = {
        set: [],
        connectOrCreate: this.toTagConnectOrCreate(payload.tags),
      };
    }

    const article = await this.prisma.article.update({
      where: { id },
      data: updateData,
      include: {
        tags: {
          select: {
            name: true,
          },
        },
      },
    });

    return this.mapPrismaArticle(article);
  }

  async findForRagIndexing(
    onlyPublished: boolean,
    articleIds?: string[],
  ): Promise<Article[]> {
    const where: Prisma.ArticleWhereInput = {};

    if (onlyPublished) {
      where.status = PrismaArticleStatus.PUBLISHED;
    }

    if (articleIds?.length) {
      where.id = { in: articleIds };
    }

    const articles = await this.prisma.article.findMany({
      where,
      include: { tags: { select: { name: true } } },
    });

    return articles.map((a) => this.mapPrismaArticle(a));
  }

  async remove(id: string): Promise<void> {
    await this.findOneOrThrow(id);
    await this.prisma.article.delete({ where: { id } });
  }

  private async findOneOrThrow(id: string): Promise<Article> {
    const article = await this.prisma.article.findUnique({
      where: { id },
      include: {
        tags: {
          select: {
            name: true,
          },
        },
      },
    });

    if (!article) {
      throw new NotFoundError('Article not found');
    }

    return this.mapPrismaArticle(article);
  }

  private mapPrismaArticle(
    article: Prisma.ArticleGetPayload<{
      include: {
        tags: {
          select: {
            name: true;
          };
        };
      };
    }>,
  ): Article {
    return {
      id: article.id,
      title: article.title,
      content: article.content,
      status: this.fromPrismaArticleStatus(article.status),
      authorId: article.authorId,
      categoryId: article.categoryId,
      tags: article.tags.map((tag) => tag.name),
      createdAt: article.createdAt.getTime(),
      updatedAt: article.updatedAt.getTime(),
    };
  }

  private fromPrismaArticleStatus(status: PrismaArticleStatus): ArticleStatus {
    switch (status) {
      case PrismaArticleStatus.PUBLISHED:
        return ArticleStatus.PUBLISHED;
      case PrismaArticleStatus.ARCHIVED:
        return ArticleStatus.ARCHIVED;
      default:
        return ArticleStatus.DRAFT;
    }
  }

  private toPrismaArticleStatus(status: ArticleStatus): PrismaArticleStatus {
    switch (status) {
      case ArticleStatus.PUBLISHED:
        return PrismaArticleStatus.PUBLISHED;
      case ArticleStatus.ARCHIVED:
        return PrismaArticleStatus.ARCHIVED;
      default:
        return PrismaArticleStatus.DRAFT;
    }
  }

  private toTagConnectOrCreate(
    tags: string[] | undefined,
  ): Prisma.TagCreateOrConnectWithoutArticlesInput[] {
    const uniqueTags = [...new Set(tags ?? [])];
    return uniqueTags.map((name) => ({
      where: { name },
      create: { name },
    }));
  }

  private async validateRelations(
    authorId: string | null | undefined,
    categoryId: string | null | undefined,
  ): Promise<void> {
    if (authorId !== undefined && authorId !== null) {
      const author = await this.prisma.user.findUnique({
        where: { id: authorId },
      });
      if (!author) {
        throw new UnprocessableEntityException('authorId does not exist');
      }
    }

    if (categoryId !== undefined && categoryId !== null) {
      const category = await this.prisma.category.findUnique({
        where: { id: categoryId },
      });
      if (!category) {
        throw new UnprocessableEntityException('categoryId does not exist');
      }
    }
  }
}
