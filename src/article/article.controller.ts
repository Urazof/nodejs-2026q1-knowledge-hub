import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Param,
  ParseUUIDPipe,
  Post,
  Query,
  Put,
} from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiCreatedResponse,
  ApiNoContentResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import { Article } from '../common/models/article.model';
import { PaginatedResponse } from '../common/models/paginated-response.model';
import { ArticleFilterQueryDto } from './dto/article-filter-query.dto';
import { CreateArticleDto } from './dto/create-article.dto';
import { UpdateArticleDto } from './dto/update-article.dto';
import { ArticleService } from './article.service';

@ApiTags('article')
@Controller('article')
export class ArticleController {
  constructor(private readonly articleService: ArticleService) {}

  @Get()
  @ApiOperation({ summary: 'Get all articles with optional filtering.' })
  @ApiOkResponse({ description: 'Articles list returned.' })
  @ApiBadRequestResponse({ description: 'Invalid query filter values.' })
  findAll(
    @Query() query: ArticleFilterQueryDto,
  ): Article[] | PaginatedResponse<Article> {
    return this.articleService.findAll(query);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get article by id.' })
  @ApiOkResponse({ description: 'Article found.' })
  @ApiBadRequestResponse({ description: 'Invalid UUID.' })
  @ApiNotFoundResponse({ description: 'Article not found.' })
  findOne(
    @Param('id', new ParseUUIDPipe({ version: '4' })) id: string,
  ): Article {
    return this.articleService.findOne(id);
  }

  @Post()
  @ApiOperation({ summary: 'Create article.' })
  @ApiCreatedResponse({ description: 'Article created.' })
  @ApiBadRequestResponse({ description: 'Invalid body.' })
  create(@Body() body: CreateArticleDto): Article {
    return this.articleService.create(body);
  }

  @Put(':id')
  @ApiOperation({ summary: 'Update article.' })
  @ApiOkResponse({ description: 'Article updated.' })
  @ApiBadRequestResponse({ description: 'Invalid UUID or body.' })
  @ApiNotFoundResponse({ description: 'Article not found.' })
  update(
    @Param('id', new ParseUUIDPipe({ version: '4' })) id: string,
    @Body() body: UpdateArticleDto,
  ): Article {
    return this.articleService.update(id, body);
  }

  @Delete(':id')
  @HttpCode(204)
  @ApiOperation({ summary: 'Delete article.' })
  @ApiNoContentResponse({ description: 'Article deleted.' })
  @ApiBadRequestResponse({ description: 'Invalid UUID.' })
  @ApiNotFoundResponse({ description: 'Article not found.' })
  remove(@Param('id', new ParseUUIDPipe({ version: '4' })) id: string): void {
    this.articleService.remove(id);
  }
}
