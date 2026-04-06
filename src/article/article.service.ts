import { Injectable, NotFoundException } from '@nestjs/common';
import { randomUUID } from 'crypto';
import { ArticleStatus } from '../common/enums/article-status.enum';
import { Article } from '../common/models/article.model';
import { PaginatedResponse } from '../common/models/paginated-response.model';
import {
  paginateItems,
  shouldPaginate,
  sortItems,
} from '../common/utils/list-query.util';
import { InMemoryDbService } from '../storage/in-memory-db.service';
import { ArticleFilterQueryDto } from './dto/article-filter-query.dto';
import { CreateArticleDto } from './dto/create-article.dto';
import { UpdateArticleDto } from './dto/update-article.dto';

@Injectable()
export class ArticleService {
  constructor(private readonly db: InMemoryDbService) {}

  findAll(
    filters: ArticleFilterQueryDto = {},
  ): Article[] | PaginatedResponse<Article> {
    const filtered = this.db.articles.filter((article) => {
      if (filters.status && article.status !== filters.status) {
        return false;
      }

      if (filters.categoryId && article.categoryId !== filters.categoryId) {
        return false;
      }

      if (filters.tag && !article.tags.includes(filters.tag)) {
        return false;
      }

      return true;
    });

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

  findOne(id: string): Article {
    return this.findOneOrThrow(id);
  }

  create(payload: CreateArticleDto): Article {
    const now = Date.now();
    const article: Article = {
      id: randomUUID(),
      title: payload.title,
      content: payload.content,
      status: payload.status ?? ArticleStatus.DRAFT,
      authorId: payload.authorId ?? null,
      categoryId: payload.categoryId ?? null,
      tags: payload.tags ?? [],
      createdAt: now,
      updatedAt: now,
    };

    this.db.articles.push(article);
    return article;
  }

  update(id: string, payload: UpdateArticleDto): Article {
    const article = this.findOneOrThrow(id);

    if (payload.title !== undefined) {
      article.title = payload.title;
    }

    if (payload.content !== undefined) {
      article.content = payload.content;
    }

    if (payload.status !== undefined) {
      article.status = payload.status;
    }

    if (payload.authorId !== undefined) {
      article.authorId = payload.authorId;
    }

    if (payload.categoryId !== undefined) {
      article.categoryId = payload.categoryId;
    }

    if (payload.tags !== undefined) {
      article.tags = payload.tags;
    }

    article.updatedAt = Date.now();
    return article;
  }

  remove(id: string): void {
    const article = this.findOneOrThrow(id);
    const index = this.db.articles.findIndex((item) => item.id === article.id);
    this.db.articles.splice(index, 1);

    const commentsToKeep = this.db.comments.filter(
      (comment) => comment.articleId !== article.id,
    );
    this.db.comments.splice(0, this.db.comments.length, ...commentsToKeep);
  }

  private findOneOrThrow(id: string): Article {
    const article = this.db.articles.find((item) => item.id === id);

    if (!article) {
      throw new NotFoundException('Article not found');
    }

    return article;
  }
}
