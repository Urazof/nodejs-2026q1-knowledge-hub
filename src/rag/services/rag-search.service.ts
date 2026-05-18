import { Injectable, Logger } from '@nestjs/common';
import { RagSearchRequestDto } from '../dto/rag-search-request.dto';
import {
  RagSearchResponseDto,
  RagSearchResultItemDto,
} from '../dto/rag-search-response.dto';
import { RagEmbeddingService } from './rag-embedding.service';
import {
  RagFilter,
  RagSearchResult,
  RagVectorService,
} from './rag-vector.service';

const DEFAULT_LIMIT = 5;
const MAX_LIMIT = 20;

/** Weights for merged hybrid score */
const SEMANTIC_WEIGHT = 0.7;
const LEXICAL_WEIGHT = 0.3;

/** Fetch this many more candidates from Qdrant than requested, then re-rank */
const CANDIDATE_MULTIPLIER = 2;

@Injectable()
export class RagSearchService {
  private readonly logger = new Logger(RagSearchService.name);

  constructor(
    private readonly embeddingService: RagEmbeddingService,
    private readonly vectorService: RagVectorService,
  ) {}

  async search(dto: RagSearchRequestDto): Promise<RagSearchResponseDto> {
    const limit = Math.min(dto.limit ?? DEFAULT_LIMIT, MAX_LIMIT);
    const candidateLimit = Math.min(limit * CANDIDATE_MULTIPLIER, MAX_LIMIT);

    this.logger.debug(
      `Search: "${dto.query}" limit=${limit} candidates=${candidateLimit} ` +
        `status=${dto.articleStatus ?? '*'} ` +
        `category=${dto.categoryId ?? '*'} ` +
        `tags=${dto.tags?.join(',') ?? '*'}`,
    );

    const queryVector = await this.embeddingService.embed(dto.query);
    const filter = this.buildFilter(dto);
    const candidates = await this.vectorService.searchPoints(
      queryVector,
      candidateLimit,
      filter,
    );

    const reranked = this.rerankHybrid(dto.query, candidates);
    this.logger.debug(
      `Search: ${candidates.length} candidates → ${Math.min(reranked.length, limit)} results after re-rank`,
    );

    const results: RagSearchResultItemDto[] = reranked
      .slice(0, limit)
      .map((r) => ({
        articleId: r.payload.articleId,
        articleTitle: r.payload.articleTitle,
        chunk: r.payload.chunkText,
        similarity: r.score,
        hybridScore: r.hybridScore,
      }));

    return { results };
  }

  /**
   * Retrieve and hybrid-rank chunks for internal use (e.g. chat pipeline).
   * Returns RagSearchResult[] with score replaced by hybridScore.
   */
  async retrieveChunks(
    query: string,
    limit: number,
  ): Promise<RagSearchResult[]> {
    const candidateLimit = Math.min(limit * CANDIDATE_MULTIPLIER, MAX_LIMIT);
    const queryVector = await this.embeddingService.embed(query);
    const candidates = await this.vectorService.searchPoints(
      queryVector,
      candidateLimit,
    );
    return this.rerankHybrid(query, candidates)
      .slice(0, limit)
      .map((r) => ({ id: r.id, score: r.hybridScore, payload: r.payload }));
  }

  private rerankHybrid(
    query: string,
    results: RagSearchResult[],
  ): Array<RagSearchResult & { hybridScore: number }> {
    return results
      .map((r) => ({
        ...r,
        hybridScore:
          SEMANTIC_WEIGHT * r.score +
          LEXICAL_WEIGHT * this.computeLexicalScore(query, r.payload.chunkText),
      }))
      .sort((a, b) => b.hybridScore - a.hybridScore);
  }

  /** TF-style lexical score: fraction of unique query tokens found in chunk */
  private computeLexicalScore(query: string, chunkText: string): number {
    const queryTokens = this.tokenize(query);
    if (queryTokens.length === 0) return 0;
    const chunkSet = new Set(this.tokenize(chunkText));
    const matches = queryTokens.filter((t) => chunkSet.has(t)).length;
    return matches / queryTokens.length;
  }

  private tokenize(text: string): string[] {
    return text
      .toLowerCase()
      .replace(/[^a-z0-9\s]/g, ' ')
      .split(/\s+/)
      .filter((t) => t.length > 2);
  }

  private buildFilter(dto: RagSearchRequestDto): RagFilter | undefined {
    const must: NonNullable<RagFilter['must']> = [];

    if (dto.articleStatus) {
      must.push({ key: 'status', match: { value: dto.articleStatus } });
    }

    if (dto.categoryId) {
      must.push({ key: 'categoryId', match: { value: dto.categoryId } });
    }

    if (dto.tags?.length) {
      // match: any → OR across the tags array field in payload
      must.push({ key: 'tags', match: { any: dto.tags } });
    }

    return must.length > 0 ? { must } : undefined;
  }
}
