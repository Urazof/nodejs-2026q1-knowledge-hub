import { Injectable, Logger } from '@nestjs/common';
import { RagSearchRequestDto } from '../dto/rag-search-request.dto';
import {
  RagSearchResponseDto,
  RagSearchResultItemDto,
} from '../dto/rag-search-response.dto';
import { RagEmbeddingService } from './rag-embedding.service';
import { RagFilter, RagVectorService } from './rag-vector.service';

const DEFAULT_LIMIT = 5;
const MAX_LIMIT = 20;

@Injectable()
export class RagSearchService {
  private readonly logger = new Logger(RagSearchService.name);

  constructor(
    private readonly embeddingService: RagEmbeddingService,
    private readonly vectorService: RagVectorService,
  ) {}

  async search(dto: RagSearchRequestDto): Promise<RagSearchResponseDto> {
    const limit = Math.min(dto.limit ?? DEFAULT_LIMIT, MAX_LIMIT);

    this.logger.debug(
      `Search: "${dto.query}" limit=${limit} ` +
        `status=${dto.articleStatus ?? '*'} ` +
        `category=${dto.categoryId ?? '*'} ` +
        `tags=${dto.tags?.join(',') ?? '*'}`,
    );

    const queryVector = await this.embeddingService.embed(dto.query);
    const filter = this.buildFilter(dto);
    const rawResults = await this.vectorService.searchPoints(
      queryVector,
      limit,
      filter,
    );

    const results: RagSearchResultItemDto[] = rawResults.map((r) => ({
      articleId: r.payload.articleId,
      articleTitle: r.payload.articleTitle,
      chunk: r.payload.chunkText,
      similarity: r.score,
    }));

    this.logger.debug(`Search returned ${results.length} results`);

    return { results };
  }

  /**
   * Builds Qdrant must-filter from optional request params.
   * All active conditions are AND-ed (must array).
   * tags uses OR-within-field: match any of the provided tags.
   */
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
