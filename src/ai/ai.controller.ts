import {
  Body,
  Controller,
  Get,
  HttpCode,
  Param,
  ParseUUIDPipe,
  Post,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import { ArticleService } from '../article/article.service';
import {
  buildAnalyzePrompt,
  buildSummarizePrompt,
  buildTranslatePrompt,
} from './prompts/article.prompts';
import { AiCacheService } from './ai-cache.service';
import { AiSessionService } from './ai-session.service';
import { AiUsageService, UsageStats } from './ai-usage.service';
import {
  AnalyzeArticleDto,
  AnalyzeArticleResponseDto,
} from './dto/analyze-article.dto';
import { GenerateDto } from './dto/generate.dto';
import {
  SummarizeArticleDto,
  SummarizeArticleResponseDto,
} from './dto/summarize-article.dto';
import {
  TranslateArticleDto,
  TranslateArticleResponseDto,
} from './dto/translate-article.dto';
import { AiRateLimitGuard } from './guards/ai-rate-limit.guard';
import { GeminiService } from './gemini.service';

interface TranslateGeminiResponse {
  translatedText: string;
  detectedLanguage: string;
}

interface AnalyzeGeminiResponse {
  analysis: string;
  suggestions: string[];
  severity: 'info' | 'warning' | 'error';
}

@ApiTags('ai')
@ApiBearerAuth()
@UseGuards(AiRateLimitGuard)
@Controller('ai')
export class AiController {
  constructor(
    private readonly geminiService: GeminiService,
    private readonly articleService: ArticleService,
    private readonly cacheService: AiCacheService,
    private readonly usageService: AiUsageService,
    private readonly sessionService: AiSessionService,
  ) {}

  @Post('articles/:articleId/summarize')
  @HttpCode(200)
  @ApiOperation({ summary: 'Summarize an article using AI.' })
  @ApiOkResponse({ description: 'Summary generated.' })
  async summarize(
    @Param('articleId', new ParseUUIDPipe({ version: '4' })) articleId: string,
    @Body() body: SummarizeArticleDto,
  ): Promise<SummarizeArticleResponseDto> {
    const article = await this.articleService.findOne(articleId);
    const maxLength = body.maxLength ?? 'medium';
    const startedAt = Date.now();

    const cacheKey = this.cacheService.buildSummarizeKey(
      articleId,
      maxLength,
      article.updatedAt,
    );

    const cached = this.cacheService.get<SummarizeArticleResponseDto>(cacheKey);
    if (cached) {
      this.cacheService.hitCount++;
      this.usageService.track('summarize', 0, 0);
      return cached;
    }
    this.cacheService.missCount++;

    const prompt = buildSummarizePrompt(article.content, maxLength);
    const result = await this.geminiService.generateContent(prompt);

    const response: SummarizeArticleResponseDto = {
      articleId,
      summary: result.text,
      originalLength: article.content.length,
      summaryLength: result.text.length,
    };

    this.cacheService.set(cacheKey, response);
    this.usageService.track(
      'summarize',
      (result.promptTokens ?? 0) + (result.outputTokens ?? 0),
      Date.now() - startedAt,
    );

    return response;
  }

  @Post('articles/:articleId/translate')
  @HttpCode(200)
  @ApiOperation({ summary: 'Translate an article using AI.' })
  @ApiOkResponse({ description: 'Translation generated.' })
  async translate(
    @Param('articleId', new ParseUUIDPipe({ version: '4' })) articleId: string,
    @Body() body: TranslateArticleDto,
  ): Promise<TranslateArticleResponseDto> {
    const article = await this.articleService.findOne(articleId);
    const startedAt = Date.now();

    const cacheKey = this.cacheService.buildTranslateKey(
      articleId,
      body.targetLanguage,
      body.sourceLanguage,
      article.updatedAt,
    );

    const cached = this.cacheService.get<TranslateArticleResponseDto>(cacheKey);
    if (cached) {
      this.cacheService.hitCount++;
      this.usageService.track('translate', 0, 0);
      return cached;
    }
    this.cacheService.missCount++;

    const prompt = buildTranslatePrompt(
      article.content,
      body.targetLanguage,
      body.sourceLanguage,
    );

    const result = await this.geminiService.generateContent(prompt);
    const parsed = this.parseJsonSafe<TranslateGeminiResponse>(result.text);

    const response: TranslateArticleResponseDto = {
      articleId,
      translatedText: parsed?.translatedText ?? result.text,
      detectedLanguage:
        parsed?.detectedLanguage ?? body.sourceLanguage ?? 'unknown',
    };

    this.cacheService.set(cacheKey, response);
    this.usageService.track(
      'translate',
      (result.promptTokens ?? 0) + (result.outputTokens ?? 0),
      Date.now() - startedAt,
    );

    return response;
  }

  @Post('articles/:articleId/analyze')
  @HttpCode(200)
  @ApiOperation({ summary: 'Analyze an article using AI.' })
  @ApiOkResponse({ description: 'Analysis generated.' })
  async analyze(
    @Param('articleId', new ParseUUIDPipe({ version: '4' })) articleId: string,
    @Body() body: AnalyzeArticleDto,
  ): Promise<AnalyzeArticleResponseDto> {
    const article = await this.articleService.findOne(articleId);
    const task = body.task ?? 'review';
    const startedAt = Date.now();

    const prompt = buildAnalyzePrompt(article.content, task);
    const result = await this.geminiService.generateContent(prompt);
    const parsed = this.parseJsonSafe<AnalyzeGeminiResponse>(result.text);

    const response: AnalyzeArticleResponseDto = {
      articleId,
      analysis: parsed?.analysis ?? result.text,
      suggestions: Array.isArray(parsed?.suggestions) ? parsed.suggestions : [],
      severity: this.normalizeSeverity(parsed?.severity),
    };

    this.usageService.track(
      `analyze:${task}`,
      (result.promptTokens ?? 0) + (result.outputTokens ?? 0),
      Date.now() - startedAt,
    );

    return response;
  }

  @Post('generate')
  @HttpCode(200)
  @ApiOperation({
    summary: 'Generic AI text generation with optional session context.',
  })
  @ApiOkResponse({ description: 'Text generated.' })
  async generate(
    @Body() body: GenerateDto,
  ): Promise<{ text: string; sessionId: string }> {
    const startedAt = Date.now();
    let { sessionId } = body;

    const history = sessionId ? this.sessionService.getHistory(sessionId) : [];

    const contextPrefix = history
      .map((m) => `${m.role === 'user' ? 'User' : 'AI'}: ${m.text}`)
      .join('\n');

    const fullPrompt = contextPrefix
      ? `${contextPrefix}\nUser: ${body.prompt}\nAI:`
      : body.prompt;

    const result = await this.geminiService.generateContent(fullPrompt);

    if (!sessionId) {
      sessionId = this.sessionService.createSession();
    }
    this.sessionService.addMessage(sessionId, 'user', body.prompt);
    this.sessionService.addMessage(sessionId, 'model', result.text);

    this.usageService.track(
      'generate',
      (result.promptTokens ?? 0) + (result.outputTokens ?? 0),
      Date.now() - startedAt,
    );

    return { text: result.text, sessionId };
  }

  @Get('usage')
  @ApiOperation({ summary: 'Get AI usage statistics.' })
  @ApiOkResponse({ description: 'Usage stats returned.' })
  getUsage(): UsageStats {
    return this.usageService.getStats();
  }

  @Get('diagnostics')
  @ApiOperation({ summary: 'Get AI observability diagnostics.' })
  @ApiOkResponse({ description: 'Diagnostics returned.' })
  getDiagnostics(): Record<string, unknown> {
    const usage = this.usageService.getStats();
    return {
      ...usage,
      cacheHitRatio: this.cacheService.getHitRatio(),
      cacheHits: this.cacheService.hitCount,
      cacheMisses: this.cacheService.missCount,
    };
  }

  private parseJsonSafe<T>(text: string): T | null {
    try {
      const cleaned = text
        .replace(/^```(?:json)?\s*/i, '')
        .replace(/\s*```$/, '')
        .trim();
      return JSON.parse(cleaned) as T;
    } catch {
      return null;
    }
  }

  private normalizeSeverity(
    value: string | undefined,
  ): 'info' | 'warning' | 'error' {
    if (value === 'warning' || value === 'error') return value;
    return 'info';
  }
}
