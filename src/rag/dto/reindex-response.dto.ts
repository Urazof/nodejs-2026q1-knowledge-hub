import { ApiProperty } from '@nestjs/swagger';

export class ReindexResponseDto {
  @ApiProperty({ description: 'Number of articles actually re-indexed' })
  indexedArticles: number;

  @ApiProperty({
    description: 'Number of articles skipped (already up to date)',
  })
  skippedArticles: number;

  @ApiProperty({ description: 'Total number of chunks stored in vector DB' })
  indexedChunks: number;

  @ApiProperty({ description: 'Qdrant collection name used for storage' })
  vectorCollection: string;
}
