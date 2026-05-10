import {
  Body,
  Controller,
  Delete,
  HttpCode,
  Param,
  ParseUUIDPipe,
  Post,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiNoContentResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import { ReindexRequestDto } from './dto/reindex-request.dto';
import { ReindexResponseDto } from './dto/reindex-response.dto';
import { RagIndexService } from './services/rag-index.service';

@ApiTags('rag')
@ApiBearerAuth()
@Controller('ai/rag')
export class RagController {
  constructor(private readonly indexService: RagIndexService) {}

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
}
