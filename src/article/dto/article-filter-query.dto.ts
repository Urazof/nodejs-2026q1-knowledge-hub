import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsOptional, IsString, IsUUID } from 'class-validator';
import { ListQueryDto } from '../../common/dto/list-query.dto';
import { ArticleStatus } from '../../common/enums/article-status.enum';

export class ArticleFilterQueryDto extends ListQueryDto {
  @ApiPropertyOptional({
    enum: ArticleStatus,
    description: 'Filter by article status.',
  })
  @IsOptional()
  @IsEnum(ArticleStatus)
  status?: ArticleStatus;

  @ApiPropertyOptional({ description: 'Filter by category UUID v4.' })
  @IsOptional()
  @IsUUID('4')
  categoryId?: string;

  @ApiPropertyOptional({ description: 'Filter by exact tag match.' })
  @IsOptional()
  @IsString()
  tag?: string;
}
