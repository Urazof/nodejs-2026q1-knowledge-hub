import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { v5 as uuidv5 } from 'uuid';
import { ArticleService } from '../../article/article.service';
import { ReindexRequestDto } from '../dto/reindex-request.dto';
import { ReindexResponseDto } from '../dto/reindex-response.dto';
import { RagChunkService } from './rag-chunk.service';
import { RagEmbeddingService } from './rag-embedding.service';
import { RagPoint, RagVectorService } from './rag-vector.service';

// Stable namespace for deterministic chunk UUIDs (RFC 4122 DNS namespace)
const CHUNK_ID_NAMESPACE = '6ba7b810-9dad-11d1-80b4-00c04fd430c8';

@Injectable()
export class RagIndexService {
  private readonly logger = new Logger(RagIndexService.name);

  constructor(
    private readonly articleService: ArticleService,
    private readonly chunkService: RagChunkService,
    private readonly embeddingService: RagEmbeddingService,
    private readonly vectorService: RagVectorService,
  ) {}

  async indexArticles(dto: ReindexRequestDto): Promise<ReindexResponseDto> {
    const onlyPublished = dto.onlyPublished ?? true;

    const articles = await this.articleService.findForRagIndexing(
      onlyPublished,
      dto.articleIds,
    );

    this.logger.log(
      `Starting index: ${articles.length} articles (onlyPublished=${onlyPublished})`,
    );

    let totalChunks = 0;

    for (const article of articles) {
      // Delete existing vectors before upsert — prevents stale chunks
      await this.vectorService.deleteByArticleId(article.id);

      const text = `${article.title}\n\n${article.content}`;
      const chunks = this.chunkService.chunk(text);

      const points: RagPoint[] = [];
      for (let i = 0; i < chunks.length; i++) {
        const vector = await this.embeddingService.embed(chunks[i]);
        points.push({
          id: this.buildChunkId(article.id, i),
          vector,
          payload: {
            articleId: article.id,
            articleTitle: article.title,
            chunkIndex: i,
            chunkText: chunks[i],
            status: article.status,
            categoryId: article.categoryId ?? null,
            tags: article.tags ?? [],
            articleUpdatedAt: article.updatedAt,
          },
        });
      }

      await this.vectorService.upsertPoints(points);
      totalChunks += chunks.length;

      this.logger.debug(`Indexed "${article.title}": ${chunks.length} chunks`);
    }

    this.logger.log(
      `Index complete: ${articles.length} articles, ${totalChunks} chunks`,
    );

    return {
      indexedArticles: articles.length,
      indexedChunks: totalChunks,
      vectorCollection: this.vectorService.collection,
    };
  }

  async deleteArticleVectors(articleId: string): Promise<void> {
    const count = await this.vectorService.countByArticleId(articleId);

    if (count === 0) {
      throw new NotFoundException(
        `No index entries found for article ${articleId}`,
      );
    }

    await this.vectorService.deleteByArticleId(articleId);
    this.logger.log(`Deleted ${count} vectors for article ${articleId}`);
  }

  // Deterministic: same articleId + chunkIndex always produces same UUID
  private buildChunkId(articleId: string, chunkIndex: number): string {
    return uuidv5(`${articleId}:${chunkIndex}`, CHUNK_ID_NAMESPACE);
  }
}
