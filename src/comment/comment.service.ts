import {
  Injectable,
  NotFoundException,
  UnprocessableEntityException,
} from '@nestjs/common';
import { randomUUID } from 'crypto';
import { Comment } from '../common/models/comment.model';
import { PaginatedResponse } from '../common/models/paginated-response.model';
import {
  paginateItems,
  shouldPaginate,
  sortItems,
} from '../common/utils/list-query.util';
import { InMemoryDbService } from '../storage/in-memory-db.service';
import { CreateCommentDto } from './dto/create-comment.dto';
import { CommentListQueryDto } from './dto/comment-list-query.dto';

@Injectable()
export class CommentService {
  constructor(private readonly db: InMemoryDbService) {}

  findAll(): Comment[] {
    return this.db.comments;
  }

  findByArticleId(
    query: CommentListQueryDto,
  ): Comment[] | PaginatedResponse<Comment> {
    const filtered = this.db.comments.filter(
      (comment) => comment.articleId === query.articleId,
    );
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

  findOne(id: string): Comment {
    const comment = this.db.comments.find((item) => item.id === id);
    if (!comment) {
      throw new NotFoundException('Comment not found');
    }
    return comment;
  }

  create(payload: CreateCommentDto): Comment {
    const articleExists = this.db.articles.some(
      (article) => article.id === payload.articleId,
    );
    if (!articleExists) {
      throw new UnprocessableEntityException('articleId does not exist');
    }

    const comment: Comment = {
      id: randomUUID(),
      content: payload.content,
      articleId: payload.articleId,
      authorId: payload.authorId ?? null,
      createdAt: Date.now(),
    };

    this.db.comments.push(comment);
    return comment;
  }

  remove(id: string): void {
    const index = this.db.comments.findIndex((item) => item.id === id);

    if (index === -1) {
      throw new NotFoundException('Comment not found');
    }

    this.db.comments.splice(index, 1);
  }
}
