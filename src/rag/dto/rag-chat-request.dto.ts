import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class RagChatRequestDto {
  @ApiProperty({ description: 'User question to answer from Knowledge Hub' })
  @IsString()
  @IsNotEmpty()
  question: string;

  @ApiPropertyOptional({
    description:
      'Conversation ID for multi-turn context (auto-generated if omitted)',
  })
  @IsOptional()
  @IsString()
  conversationId?: string;
}
