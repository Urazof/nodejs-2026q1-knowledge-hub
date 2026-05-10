import {
  HttpException,
  Injectable,
  Logger,
  OnModuleInit,
  ServiceUnavailableException,
} from '@nestjs/common';
import { QdrantClient } from '@qdrant/js-client-rest';

/** Dimension of Gemini embedding vectors (gemini-embedding-001 with outputDimensionality=768) */
const VECTOR_SIZE = 768;

/** Minimum cosine similarity to include in results */
const SCORE_THRESHOLD = 0.3;

export interface RagPoint {
  id: string;
  vector: number[];
  payload: ChunkPayload;
}

export interface ChunkPayload {
  articleId: string;
  articleTitle: string;
  chunkIndex: number;
  chunkText: string;
  status: string;
  categoryId: string | null;
  tags: string[];
  articleUpdatedAt: number;
}

export interface RagSearchResult {
  id: string;
  score: number;
  payload: ChunkPayload;
}

export interface RagFilter {
  must?: Array<
    | { key: string; match: { value: string | number | boolean } }
    | { key: string; match: { any: Array<string | number | boolean> } }
  >;
}

@Injectable()
export class RagVectorService implements OnModuleInit {
  private readonly logger = new Logger(RagVectorService.name);
  private readonly client: QdrantClient;
  readonly collection: string;

  constructor() {
    const url = process.env.RAG_VECTOR_DB_URL ?? 'http://localhost:6333';
    this.collection =
      process.env.RAG_VECTOR_COLLECTION ?? 'knowledge_hub_articles';
    this.client = new QdrantClient({ url });
  }

  async onModuleInit(): Promise<void> {
    try {
      await this.ensureCollection();
      this.logger.log(`Qdrant ready — collection: "${this.collection}"`);
    } catch (error) {
      const msg = error instanceof Error ? error.message : String(error);
      this.logger.warn(
        `Qdrant unavailable at startup: ${msg}. ` +
          'RAG endpoints will return 503 until the vector DB is reachable.',
      );
    }
  }

  async upsertPoints(points: RagPoint[]): Promise<void> {
    await this.safeCall('upsertPoints', () =>
      this.client.upsert(this.collection, {
        wait: true,
        points: points.map((p) => ({
          id: p.id,
          vector: p.vector,
          payload: p.payload as unknown as Record<string, unknown>,
        })),
      }),
    );
  }

  async searchPoints(
    vector: number[],
    limit: number,
    filter?: RagFilter,
  ): Promise<RagSearchResult[]> {
    return this.safeCall('searchPoints', async () => {
      const results = await this.client.search(this.collection, {
        vector,
        limit,
        filter: filter as Parameters<QdrantClient['search']>[1]['filter'],
        with_payload: true,
        score_threshold: SCORE_THRESHOLD,
      });

      return results.map((r) => ({
        id: String(r.id),
        score: r.score,
        payload: r.payload as unknown as ChunkPayload,
      }));
    });
  }

  async deleteByArticleId(articleId: string): Promise<void> {
    await this.safeCall('deleteByArticleId', () =>
      this.client.delete(this.collection, {
        filter: {
          must: [{ key: 'articleId', match: { value: articleId } }],
        },
      }),
    );
  }

  async countByArticleId(articleId: string): Promise<number> {
    return this.safeCall('countByArticleId', async () => {
      const result = await this.client.count(this.collection, {
        filter: {
          must: [{ key: 'articleId', match: { value: articleId } }],
        },
        exact: true,
      });
      return result.count;
    });
  }

  async recreateCollection(): Promise<void> {
    await this.safeCall('recreateCollection', async () => {
      const exists = await this.collectionExists();
      if (exists) {
        await this.client.deleteCollection(this.collection);
      }
      await this.client.createCollection(this.collection, {
        vectors: { size: VECTOR_SIZE, distance: 'Cosine' },
      });
      this.logger.log(`Collection "${this.collection}" recreated`);
    });
  }

  async getArticleTimestamp(articleId: string): Promise<number | null> {
    return this.safeCall('getArticleTimestamp', async () => {
      const result = await this.client.scroll(this.collection, {
        filter: {
          must: [{ key: 'articleId', match: { value: articleId } }],
        },
        limit: 1,
        with_payload: ['articleUpdatedAt'],
      });
      const point = result.points[0];
      return (point?.payload?.['articleUpdatedAt'] as number) ?? null;
    });
  }

  private async ensureCollection(): Promise<void> {
    const exists = await this.collectionExists();
    if (!exists) {
      await this.client.createCollection(this.collection, {
        vectors: { size: VECTOR_SIZE, distance: 'Cosine' },
      });
      this.logger.log(`Created Qdrant collection: "${this.collection}"`);
    }
  }

  private async collectionExists(): Promise<boolean> {
    try {
      await this.client.getCollection(this.collection);
      return true;
    } catch {
      return false;
    }
  }

  private async safeCall<T>(
    operation: string,
    fn: () => Promise<T>,
  ): Promise<T> {
    try {
      return await fn();
    } catch (error) {
      // Pass HTTP exceptions through unchanged — they carry intentional status codes
      if (error instanceof HttpException) throw error;

      const msg = error instanceof Error ? error.message : String(error);
      this.logger.error(`Qdrant ${operation} failed: ${msg}`);
      throw new ServiceUnavailableException(
        'Vector database is unavailable. Please try again later.',
      );
    }
  }
}
