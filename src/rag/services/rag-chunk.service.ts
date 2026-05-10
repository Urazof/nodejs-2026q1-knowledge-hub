import { Injectable } from '@nestjs/common';

@Injectable()
export class RagChunkService {
  private readonly chunkSize: number;
  private readonly overlap: number;

  constructor() {
    this.chunkSize = parseInt(process.env.RAG_CHUNK_SIZE ?? '800', 10);
    this.overlap = parseInt(process.env.RAG_CHUNK_OVERLAP ?? '200', 10);
  }

  /**
   * Splits text into overlapping chunks of fixed size.
   * Deterministic: same text always produces same chunks (stable IDs on reindex).
   */
  chunk(text: string): string[] {
    const trimmed = text.trim();
    if (!trimmed) return [];

    const chunks: string[] = [];
    const step = this.chunkSize - this.overlap;
    let start = 0;

    while (start < trimmed.length) {
      const end = Math.min(start + this.chunkSize, trimmed.length);
      chunks.push(trimmed.slice(start, end));
      if (end === trimmed.length) break;
      start += step;
    }

    return chunks;
  }
}
