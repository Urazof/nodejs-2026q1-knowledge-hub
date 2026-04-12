import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsArray,
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
  ValidateIf,
} from 'class-validator';
import { ArticleStatus } from '../../common/enums/article-status.enum';

export class CreateArticleDto {
  @ApiProperty({ description: 'Article title.' })
  @IsString()
  @IsNotEmpty()
  title!: string;

  @ApiProperty({ description: 'Article content.' })
  @IsString()
  @IsNotEmpty()
  content!: string;

  @ApiPropertyOptional({ enum: ArticleStatus, description: 'Article status.' })
  @IsOptional()
  @IsEnum(ArticleStatus)
  status?: ArticleStatus;

  @ApiPropertyOptional({ description: 'Author UUID v4, can be null.' })
  @IsOptional()
  @ValidateIf((_, value) => value !== null)
  @IsUUID('4')
  authorId?: string | null;

  @ApiPropertyOptional({ description: 'Category UUID v4, can be null.' })
  @IsOptional()
  @ValidateIf((_, value) => value !== null)
  @IsUUID('4')
  categoryId?: string | null;

  @ApiPropertyOptional({ type: [String], description: 'Article tags.' })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  tags?: string[];
}
