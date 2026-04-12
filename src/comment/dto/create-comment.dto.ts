import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
  ValidateIf,
} from 'class-validator';

export class CreateCommentDto {
  @ApiProperty({ description: 'Comment content.' })
  @IsString()
  @IsNotEmpty()
  content!: string;

  @ApiProperty({ description: 'Article UUID v4.' })
  @IsUUID('4')
  articleId!: string;

  @ApiPropertyOptional({ description: 'Author UUID v4, can be null.' })
  @IsOptional()
  @ValidateIf((_, value) => value !== null)
  @IsUUID('4')
  authorId?: string | null;
}
