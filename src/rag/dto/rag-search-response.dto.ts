import { ApiProperty } from '@nestjs/swagger';

export class RagSearchResultItemDto {
  @ApiProperty({ description: 'Source article UUID' })
  articleId: string;

  @ApiProperty({ description: 'Source article title' })
  articleTitle: string;

  @ApiProperty({ description: 'Relevant text chunk from the article' })
  chunk: string;

  @ApiProperty({
    description: 'Semantic cosine similarity score from Qdrant [0..1]',
  })
  similarity: number;

  @ApiProperty({
    description:
      'Hybrid re-rank score: 0.7 × semantic + 0.3 × lexical [0..1], higher = more relevant',
  })
  hybridScore: number;
}

export class RagSearchResponseDto {
  @ApiProperty({ type: [RagSearchResultItemDto] })
  results: RagSearchResultItemDto[];
}
