import { Injectable, NotFoundException } from '@nestjs/common';
import { ListQueryDto } from '../common/dto/list-query.dto';
import { Category } from '../common/models/category.model';
import { PaginatedResponse } from '../common/models/paginated-response.model';
import {
  paginateItems,
  shouldPaginate,
  sortItems,
} from '../common/utils/list-query.util';
import { PrismaService } from '../prisma/prisma.service';
import { CreateCategoryDto } from './dto/create-category.dto';
import { UpdateCategoryDto } from './dto/update-category.dto';

@Injectable()
export class CategoryService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(
    query: ListQueryDto = {},
  ): Promise<Category[] | PaginatedResponse<Category>> {
    const categories = await this.prisma.category.findMany();
    const sorted = sortItems(categories, query.sortBy, query.order ?? 'asc', [
      'id',
      'name',
      'description',
    ]);

    if (shouldPaginate(query)) {
      return paginateItems(sorted, query.page ?? 1, query.limit ?? 10);
    }

    return sorted;
  }

  async findOne(id: string): Promise<Category> {
    return this.findOneOrThrow(id);
  }

  async create(payload: CreateCategoryDto): Promise<Category> {
    return this.prisma.category.create({
      data: {
        name: payload.name,
        description: payload.description,
      },
    });
  }

  async update(id: string, payload: UpdateCategoryDto): Promise<Category> {
    await this.findOneOrThrow(id);

    return this.prisma.category.update({
      where: { id },
      data: {
        ...(payload.name !== undefined && { name: payload.name }),
        ...(payload.description !== undefined && {
          description: payload.description,
        }),
      },
    });
  }

  async remove(id: string): Promise<void> {
    await this.findOneOrThrow(id);
    await this.prisma.category.delete({ where: { id } });
  }

  private async findOneOrThrow(id: string): Promise<Category> {
    const category = await this.prisma.category.findUnique({ where: { id } });

    if (!category) {
      throw new NotFoundException('Category not found');
    }

    return category;
  }
}
