import { ListQueryDto, SortOrder } from '../dto/list-query.dto';
import { PaginatedResponse } from '../models/paginated-response.model';

export function shouldPaginate(query: ListQueryDto): boolean {
  return query.page !== undefined || query.limit !== undefined;
}

export function sortItems<T>(
  items: T[],
  sortBy: string | undefined,
  order: SortOrder,
  allowedFields: string[],
): T[] {
  if (!sortBy || !allowedFields.includes(sortBy)) {
    return items;
  }

  const direction = order === 'desc' ? -1 : 1;

  return [...items].sort((left, right) => {
    const a = (left as Record<string, unknown>)[sortBy];
    const b = (right as Record<string, unknown>)[sortBy];

    if (a === b) {
      return 0;
    }

    if (a === null || a === undefined) {
      return 1;
    }

    if (b === null || b === undefined) {
      return -1;
    }

    if (typeof a === 'number' && typeof b === 'number') {
      return (a - b) * direction;
    }

    return String(a).localeCompare(String(b)) * direction;
  });
}

export function paginateItems<T>(
  items: T[],
  page = 1,
  limit = 10,
): PaginatedResponse<T> {
  const start = (page - 1) * limit;
  const end = start + limit;

  return {
    total: items.length,
    page,
    limit,
    data: items.slice(start, end),
  };
}
