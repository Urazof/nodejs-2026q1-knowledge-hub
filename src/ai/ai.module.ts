import { Module } from '@nestjs/common';
import { ArticleModule } from '../article/article.module';
import { AiCacheService } from './ai-cache.service';
import { AiController } from './ai.controller';
import { AiSessionService } from './ai-session.service';
import { AiUsageService } from './ai-usage.service';
import { GeminiService } from './gemini.service';
import { AiRateLimitGuard } from './guards/ai-rate-limit.guard';

@Module({
  imports: [ArticleModule],
  controllers: [AiController],
  providers: [
    GeminiService,
    AiCacheService,
    AiUsageService,
    AiSessionService,
    AiRateLimitGuard,
  ],
})
export class AiModule {}
