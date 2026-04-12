import { Injectable, NotFoundException } from '@nestjs/common';
import { randomUUID } from 'crypto';
import { ListQueryDto } from '../common/dto/list-query.dto';
import { Category } from '../common/models/category.model';
import { PaginatedResponse } from '../common/models/paginated-response.model';
import {
  paginateItems,
  shouldPaginate,
  sortItems,
} from '../common/utils/list-query.util';
import { InMemoryDbService } from '../storage/in-memory-db.service';
import { CreateCategoryDto } from './dto/create-category.dto';
import { UpdateCategoryDto } from './dto/update-category.dto';

@Injectable()
export class CategoryService {
  constructor(private readonly db: InMemoryDbService) {}

  findAll(query: ListQueryDto = {}): Category[] | PaginatedResponse<Category> {
    const sorted = sortItems(
      this.db.categories,
      query.sortBy,
      query.order ?? 'asc',
      ['id', 'name', 'description'],
    );

    if (shouldPaginate(query)) {
      return paginateItems(sorted, query.page ?? 1, query.limit ?? 10);
    }

    return sorted;
  }

  findOne(id: string): Category {
    return this.findOneOrThrow(id);
  }

  create(payload: CreateCategoryDto): Category {
    const category: Category = {
      id: randomUUID(),
      name: payload.name,
      description: payload.description,
    };

    this.db.categories.push(category);
    return category;
  }

  update(id: string, payload: UpdateCategoryDto): Category {
    const category = this.findOneOrThrow(id);

    if (payload.name !== undefined) {
      category.name = payload.name;
    }

    if (payload.description !== undefined) {
      category.description = payload.description;
    }

    return category;
  }

  remove(id: string): void {
    const category = this.findOneOrThrow(id);
    const index = this.db.categories.findIndex(
      (item) => item.id === category.id,
    );
    this.db.categories.splice(index, 1);

    this.db.articles.forEach((article) => {
      if (article.categoryId === category.id) {
        article.categoryId = null;
      }
    });
  }

  private findOneOrThrow(id: string): Category {
    const category = this.db.categories.find((item) => item.id === id);

    if (!category) {
      throw new NotFoundException('Category not found');
    }

    return category;
  }
}
