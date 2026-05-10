import { ApiProperty } from '@nestjs/swagger';

export class RagSearchResultItemDto {
  @ApiProperty({ description: 'Source article UUID' })
  articleId: string;

  @ApiProperty({ description: 'Source article title' })
  articleTitle: string;

  @ApiProperty({ description: 'Relevant text chunk from the article' })
  chunk: string;

  @ApiProperty({
    description: 'Cosine similarity score [0..1], higher = more relevant',
  })
  similarity: number;
}

export class RagSearchResponseDto {
  @ApiProperty({ type: [RagSearchResultItemDto] })
  results: RagSearchResultItemDto[];
}
