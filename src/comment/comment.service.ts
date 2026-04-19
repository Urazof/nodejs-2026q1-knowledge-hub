import {
  ForbiddenException,
  Injectable,
  NotFoundException,
  UnprocessableEntityException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { JwtUser } from '../auth/decorators/current-user.decorator';
import { Comment } from '../common/models/comment.model';
import { PaginatedResponse } from '../common/models/paginated-response.model';
import {
  paginateItems,
  shouldPaginate,
  sortItems,
} from '../common/utils/list-query.util';
import { PrismaService } from '../prisma/prisma.service';
import { CreateCommentDto } from './dto/create-comment.dto';
import { CommentListQueryDto } from './dto/comment-list-query.dto';

@Injectable()
export class CommentService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(): Promise<Comment[]> {
    const comments = await this.prisma.comment.findMany();
    return comments.map((comment) => this.mapPrismaComment(comment));
  }

  async findByArticleId(
    query: CommentListQueryDto,
  ): Promise<Comment[] | PaginatedResponse<Comment>> {
    const filtered = (
      await this.prisma.comment.findMany({
        where: {
          articleId: query.articleId,
        },
      })
    ).map((comment) => this.mapPrismaComment(comment));

    const sorted = sortItems(filtered, query.sortBy, query.order ?? 'asc', [
      'id',
      'content',
      'articleId',
      'authorId',
      'createdAt',
    ]);

    if (shouldPaginate(query)) {
      return paginateItems(sorted, query.page ?? 1, query.limit ?? 10);
    }

    return sorted;
  }

  async findOne(id: string): Promise<Comment> {
    const comment = await this.prisma.comment.findUnique({ where: { id } });

    if (!comment) {
      throw new NotFoundException('Comment not found');
    }

    return this.mapPrismaComment(comment);
  }

  async create(payload: CreateCommentDto): Promise<Comment> {
    const article = await this.prisma.article.findUnique({
      where: { id: payload.articleId },
    });

    if (!article) {
      throw new UnprocessableEntityException('articleId does not exist');
    }

    if (payload.authorId !== undefined && payload.authorId !== null) {
      const author = await this.prisma.user.findUnique({
        where: { id: payload.authorId },
      });
      if (!author) {
        throw new UnprocessableEntityException('authorId does not exist');
      }
    }

    const comment = await this.prisma.comment.create({
      data: {
        content: payload.content,
        articleId: payload.articleId,
        authorId: payload.authorId ?? null,
      },
    });

    return this.mapPrismaComment(comment);
  }

  async remove(id: string, currentUser?: JwtUser): Promise<void> {
    const comment = await this.prisma.comment.findUnique({ where: { id } });

    if (!comment) {
      throw new NotFoundException('Comment not found');
    }

    if (
      currentUser?.role === 'editor' &&
      comment.authorId !== currentUser.userId
    ) {
      throw new ForbiddenException('You can only delete your own comments');
    }

    await this.prisma.comment.delete({ where: { id } });
  }

  private mapPrismaComment(
    comment: Prisma.CommentGetPayload<Record<string, never>>,
  ): Comment {
    return {
      id: comment.id,
      content: comment.content,
      articleId: comment.articleId,
      authorId: comment.authorId,
      createdAt: comment.createdAt.getTime(),
    };
  }
}
