import { ApiProperty } from '@nestjs/swagger';

export class ConversationMessageDto {
  @ApiProperty({ enum: ['user', 'assistant'] })
  role: 'user' | 'assistant';

  @ApiProperty()
  content: string;

  @ApiProperty({ description: 'Unix timestamp in milliseconds' })
  timestamp: number;
}

export class ConversationHistoryResponseDto {
  @ApiProperty()
  conversationId: string;

  @ApiProperty({ type: [ConversationMessageDto] })
  messages: ConversationMessageDto[];
}
