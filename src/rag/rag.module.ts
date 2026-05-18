import { Module } from '@nestjs/common';
import { AiModule } from '../ai/ai.module';
import { ArticleModule } from '../article/article.module';
import { RagController } from './rag.controller';
import { RagChatService } from './services/rag-chat.service';
import { RagChunkService } from './services/rag-chunk.service';
import { RagEmbeddingService } from './services/rag-embedding.service';
import { RagIndexService } from './services/rag-index.service';
import { RagSearchService } from './services/rag-search.service';
import { RagVectorService } from './services/rag-vector.service';

@Module({
  imports: [AiModule, ArticleModule],
  controllers: [RagController],
  providers: [
    RagVectorService,
    RagEmbeddingService,
    RagChunkService,
    RagIndexService,
    RagSearchService,
    RagChatService,
  ],
  exports: [RagVectorService, RagEmbeddingService, RagChunkService],
})
export class RagModule {}
