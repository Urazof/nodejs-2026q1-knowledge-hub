import { ApiProperty } from '@nestjs/swagger';

export class RagChatSourceDto {
  @ApiProperty() articleId: string;
  @ApiProperty() articleTitle: string;
  @ApiProperty() relevantChunk: string;
}

export class RagChatResponseDto {
  @ApiProperty({
    description: 'Generated answer grounded in Knowledge Hub content',
  })
  answer: string;

  @ApiProperty({
    type: [RagChatSourceDto],
    description: 'Chunks used as context for generation',
  })
  sources: RagChatSourceDto[];

  @ApiProperty({
    description: 'Conversation ID — pass back for multi-turn context',
  })
  conversationId: string;
}
