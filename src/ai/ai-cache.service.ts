import { Injectable } from '@nestjs/common';

interface CacheEntry<T> {
  data: T;
  expiresAt: number;
}

@Injectable()
export class AiCacheService {
  private readonly store = new Map<string, CacheEntry<unknown>>();
  private readonly ttlSec: number;

  constructor() {
    this.ttlSec = Number(process.env.AI_CACHE_TTL_SEC ?? 300);
  }

  get<T>(key: string): T | null {
    const entry = this.store.get(key) as CacheEntry<T> | undefined;
    if (!entry) return null;
    if (Date.now() > entry.expiresAt) {
      this.store.delete(key);
      return null;
    }
    return entry.data;
  }

  set<T>(key: string, data: T): void {
    this.store.set(key, {
      data,
      expiresAt: Date.now() + this.ttlSec * 1000,
    });
  }

  buildSummarizeKey(
    articleId: string,
    maxLength: string,
    updatedAt: number,
  ): string {
    return `summarize:${articleId}:${maxLength}:${updatedAt}`;
  }

  buildTranslateKey(
    articleId: string,
    targetLanguage: string,
    sourceLanguage: string | undefined,
    updatedAt: number,
  ): string {
    const src = sourceLanguage ?? 'auto';
    return `translate:${articleId}:${targetLanguage}:${src}:${updatedAt}`;
  }

  /** Metrics */
  hitCount = 0;
  missCount = 0;

  getHitRatio(): number {
    const total = this.hitCount + this.missCount;
    return total === 0 ? 0 : this.hitCount / total;
  }
}
