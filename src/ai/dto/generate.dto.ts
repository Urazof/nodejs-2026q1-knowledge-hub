import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class GenerateDto {
  @ApiProperty({ example: 'Explain the concept of recursion in simple terms' })
  @IsString()
  @IsNotEmpty()
  prompt: string;

  @ApiPropertyOptional({ description: 'Session ID for conversation context' })
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  sessionId?: string;
}
