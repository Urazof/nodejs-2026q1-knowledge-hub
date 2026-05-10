import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsArray, IsBoolean, IsOptional, IsUUID } from 'class-validator';

export class ReindexRequestDto {
  @ApiPropertyOptional({
    description: 'Index only published articles (default: true)',
    default: true,
  })
  @IsOptional()
  @IsBoolean()
  onlyPublished?: boolean;

  @ApiPropertyOptional({
    description: 'Selective reindex: only these article IDs',
    type: [String],
  })
  @IsOptional()
  @IsArray()
  @IsUUID('4', { each: true })
  articleIds?: string[];
}
