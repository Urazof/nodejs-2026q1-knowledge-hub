import { describe, it, expect } from 'vitest';
import { shouldPaginate, sortItems, paginateItems } from './list-query.util';
import { sanitizeUser } from './sanitize-user';
import { UserRole } from '../enums/user-role.enum';

describe('shouldPaginate', () => {
  it('returns false when neither page nor limit provided', () => {
    expect(shouldPaginate({})).toBe(false);
  });

  it('returns true when page is provided', () => {
    expect(shouldPaginate({ page: 1 })).toBe(true);
  });

  it('returns true when limit is provided', () => {
    expect(shouldPaginate({ limit: 10 })).toBe(true);
  });
});

describe('sortItems', () => {
  const items = [
    { id: 'b', name: 'Banana', score: 2 },
    { id: 'a', name: 'Apple', score: 1 },
    { id: 'c', name: 'Cherry', score: 3 },
  ];

  it('returns items unchanged when sortBy is undefined', () => {
    const result = sortItems(items, undefined, 'asc', ['name']);
    expect(result).toEqual(items);
  });

  it('returns items unchanged when sortBy field not in allowedFields', () => {
    const result = sortItems(items, 'forbidden', 'asc', ['name']);
    expect(result).toEqual(items);
  });

  it('sorts strings ascending', () => {
    const result = sortItems(items, 'name', 'asc', ['name']);
    expect(result.map((i) => i.name)).toEqual(['Apple', 'Banana', 'Cherry']);
  });

  it('sorts strings descending', () => {
    const result = sortItems(items, 'name', 'desc', ['name']);
    expect(result.map((i) => i.name)).toEqual(['Cherry', 'Banana', 'Apple']);
  });

  it('sorts numbers ascending', () => {
    const result = sortItems(items, 'score', 'asc', ['score']);
    expect(result.map((i) => i.score)).toEqual([1, 2, 3]);
  });

  it('puts null values last', () => {
    const withNulls = [{ v: null }, { v: 1 }, { v: 2 }] as Array<{ v: number | null }>;
    const result = sortItems(withNulls, 'v', 'asc', ['v']);
    expect(result[result.length - 1].v).toBeNull();
  });
});

describe('paginateItems', () => {
  const items = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11];

  it('returns correct page slice', () => {
    const result = paginateItems(items, 2, 3);
    expect(result.data).toEqual([4, 5, 6]);
  });

  it('returns total count equal to full array length', () => {
    expect(paginateItems(items, 1, 5).total).toBe(11);
  });

  it('returns empty data array when page exceeds total', () => {
    expect(paginateItems(items, 10, 5).data).toEqual([]);
  });
});

describe('sanitizeUser', () => {
  const user = {
    id: 'u1',
    login: 'alice',
    password: 'secret_hash',
    role: UserRole.VIEWER,
    createdAt: 1000,
    updatedAt: 2000,
  };

  it('removes password from returned object', () => {
    const result = sanitizeUser(user);
    expect(result).not.toHaveProperty('password');
  });

  it('keeps all other fields intact', () => {
    const result = sanitizeUser(user);
    expect(result.id).toBe('u1');
    expect(result.login).toBe('alice');
    expect(result.role).toBe(UserRole.VIEWER);
  });
});
