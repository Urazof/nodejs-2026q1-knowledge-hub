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
  ApiServiceUnavailableResponse,
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

const SERVICE_UNAVAILABLE_DESC =
  'Qdrant vector DB or Gemini API is unavailable';

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
    description:
      'Chunks articles, generates embeddings via Gemini, and stores vectors in Qdrant. ' +
      'Runs delete-before-upsert per article to prevent stale vectors.',
  })
  @ApiOkResponse({ type: ReindexResponseDto })
  @ApiServiceUnavailableResponse({ description: SERVICE_UNAVAILABLE_DESC })
  index(@Body() dto: ReindexRequestDto): Promise<ReindexResponseDto> {
    return this.indexService.indexArticles(dto);
  }

  @Delete('index/articles/:articleId')
  @HttpCode(204)
  @ApiOperation({
    summary: 'Remove all vector entries for a specific article',
  })
  @ApiNoContentResponse({ description: 'Vectors successfully removed' })
  @ApiNotFoundResponse({
    description: 'No index entries found for this article',
  })
  @ApiServiceUnavailableResponse({ description: SERVICE_UNAVAILABLE_DESC })
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
    description:
      'Embeds the query via Gemini, performs cosine similarity search in Qdrant. ' +
      'Supports optional metadata filters (status, categoryId, tags).',
  })
  @ApiOkResponse({ type: RagSearchResponseDto })
  @ApiBadRequestResponse({
    description: 'query is required and must not be empty',
  })
  @ApiServiceUnavailableResponse({ description: SERVICE_UNAVAILABLE_DESC })
  search(@Body() dto: RagSearchRequestDto): Promise<RagSearchResponseDto> {
    return this.searchService.search(dto);
  }

  // ── Chat ───────────────────────────────────────────────────────────────

  @Post('chat')
  @HttpCode(200)
  @ApiOperation({
    summary: 'Ask a question answered from Knowledge Hub content',
    description:
      'Full RAG pipeline: embeds question → retrieves top-5 chunks from Qdrant → ' +
      'builds grounded prompt with conversation history → generates answer via Gemini. ' +
      'Pass conversationId back to maintain multi-turn context.',
  })
  @ApiOkResponse({ type: RagChatResponseDto })
  @ApiBadRequestResponse({
    description: 'question is required and must not be empty',
  })
  @ApiServiceUnavailableResponse({ description: SERVICE_UNAVAILABLE_DESC })
  chat(@Body() dto: RagChatRequestDto): Promise<RagChatResponseDto> {
    return this.chatService.chat(dto);
  }

  @Get('chat/:conversationId/history')
  @ApiOperation({
    summary: 'Retrieve message history for a conversation',
    description:
      'Returns all stored messages for the given conversationId. Returns empty array if not found.',
  })
  @ApiOkResponse({ type: ConversationHistoryResponseDto })
  getHistory(
    @Param('conversationId') conversationId: string,
  ): ConversationHistoryResponseDto {
    return this.chatService.getHistory(conversationId);
  }
}
