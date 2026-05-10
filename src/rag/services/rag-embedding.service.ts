import { Injectable } from '@nestjs/common';
import { GeminiService } from '../../ai/gemini.service';

@Injectable()
export class RagEmbeddingService {
  constructor(private readonly gemini: GeminiService) {}

  embed(text: string): Promise<number[]> {
    return this.gemini.embedContent(text);
  }
}
