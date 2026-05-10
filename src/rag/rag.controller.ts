import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Param,
  ParseUUIDPipe,
  Post,
} from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiBearerAuth,
  ApiNoContentResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import { ConversationHistoryResponseDto } from './dto/conversation-history-response.dto';
import { RagChatRequestDto } from './dto/rag-chat-request.dto';
import { RagChatResponseDto } from './dto/rag-chat-response.dto';
import { RagSearchRequestDto } from './dto/rag-search-request.dto';
import { RagSearchResponseDto } from './dto/rag-search-response.dto';
import { ReindexRequestDto } from './dto/reindex-request.dto';
import { ReindexResponseDto } from './dto/reindex-response.dto';
import { RagChatService } from './services/rag-chat.service';
import { RagIndexService } from './services/rag-index.service';
import { RagSearchService } from './services/rag-search.service';

@ApiTags('rag')
@ApiBearerAuth()
@Controller('ai/rag')
export class RagController {
  constructor(
    private readonly indexService: RagIndexService,
    private readonly searchService: RagSearchService,
    private readonly chatService: RagChatService,
  ) {}

  // ── Index ──────────────────────────────────────────────────────────────

  @Post('index')
  @HttpCode(200)
  @ApiOperation({
    summary: 'Build or refresh vector index from Knowledge Hub articles',
  })
  @ApiOkResponse({ type: ReindexResponseDto })
  index(@Body() dto: ReindexRequestDto): Promise<ReindexResponseDto> {
    return this.indexService.indexArticles(dto);
  }

  @Delete('index/articles/:articleId')
  @HttpCode(204)
  @ApiOperation({ summary: 'Remove all vector entries for an article' })
  @ApiNoContentResponse({ description: 'Vectors removed' })
  @ApiNotFoundResponse({
    description: 'No index entries found for this article',
  })
  deleteFromIndex(
    @Param('articleId', new ParseUUIDPipe({ version: '4' })) articleId: string,
  ): Promise<void> {
    return this.indexService.deleteArticleVectors(articleId);
  }

  // ── Search ─────────────────────────────────────────────────────────────

  @Post('search')
  @HttpCode(200)
  @ApiOperation({
    summary: 'Semantic search across indexed Knowledge Hub articles',
  })
  @ApiOkResponse({ type: RagSearchResponseDto })
  @ApiBadRequestResponse({ description: 'query is required' })
  search(@Body() dto: RagSearchRequestDto): Promise<RagSearchResponseDto> {
    return this.searchService.search(dto);
  }

  // ── Chat ───────────────────────────────────────────────────────────────

  @Post('chat')
  @HttpCode(200)
  @ApiOperation({
    summary:
      'Ask a question — RAG retrieves context and Gemini generates answer',
  })
  @ApiOkResponse({ type: RagChatResponseDto })
  @ApiBadRequestResponse({ description: 'question is required' })
  chat(@Body() dto: RagChatRequestDto): Promise<RagChatResponseDto> {
    return this.chatService.chat(dto);
  }

  @Get('chat/:conversationId/history')
  @ApiOperation({ summary: 'Retrieve full message history for a conversation' })
  @ApiOkResponse({ type: ConversationHistoryResponseDto })
  getHistory(
    @Param('conversationId') conversationId: string,
  ): ConversationHistoryResponseDto {
    return this.chatService.getHistory(conversationId);
  }
}
