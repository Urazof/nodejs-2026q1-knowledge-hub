import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsIn, IsOptional } from 'class-validator';

export class SummarizeArticleDto {
  @ApiPropertyOptional({
    enum: ['short', 'medium', 'detailed'],
    default: 'medium',
  })
  @IsOptional()
  @IsIn(['short', 'medium', 'detailed'])
  maxLength?: 'short' | 'medium' | 'detailed';
}

export class SummarizeArticleResponseDto {
  articleId: string;
  summary: string;
  originalLength: number;
  summaryLength: number;
}
