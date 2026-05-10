import { Injectable, Logger } from '@nestjs/common';
import { v4 as uuidv4 } from 'uuid';
import { GeminiService } from '../../ai/gemini.service';
import { ConversationHistoryResponseDto } from '../dto/conversation-history-response.dto';
import { RagChatRequestDto } from '../dto/rag-chat-request.dto';
import {
  RagChatResponseDto,
  RagChatSourceDto,
} from '../dto/rag-chat-response.dto';
import { RagSearchResult } from './rag-vector.service';
import { RagSearchService } from './rag-search.service';

interface ConversationMessage {
  role: 'user' | 'assistant';
  content: string;
  timestamp: number;
}

/** Number of most recent exchanges included in the prompt (1 exchange = user + assistant) */
const HISTORY_WINDOW = 6;

/** How many chunks to retrieve and pass as context */
const CHAT_RETRIEVE_LIMIT = 5;

@Injectable()
export class RagChatService {
  private readonly logger = new Logger(RagChatService.name);
  private readonly memory = new Map<string, ConversationMessage[]>();
  private readonly maxMessages: number;

  constructor(
    private readonly searchService: RagSearchService,
    private readonly gemini: GeminiService,
  ) {
    this.maxMessages = parseInt(
      process.env.RAG_CONVERSATION_MAX_MESSAGES ?? '20',
      10,
    );
  }

  async chat(dto: RagChatRequestDto): Promise<RagChatResponseDto> {
    const conversationId = dto.conversationId ?? uuidv4();
    const history = this.getOrCreate(conversationId);

    this.logger.debug(
      `Chat [${conversationId}] question="${dto.question}" history=${history.length}`,
    );

    // 1. Embed + hybrid-retrieve top-N chunks (semantic + lexical re-rank)
    const chunks = await this.searchService.retrieveChunks(
      dto.question,
      CHAT_RETRIEVE_LIMIT,
    );

    // 2. Build prompt: system instructions + history + context + question
    const prompt = this.buildPrompt(dto.question, chunks, history);

    // 3. Generate answer via Gemini
    const result = await this.gemini.generateContent(prompt);

    // 4. Persist exchange in memory (user first, then assistant)
    this.addMessage(conversationId, 'user', dto.question);
    this.addMessage(conversationId, 'assistant', result.text);

    // 5. Build source attribution from the chunks passed to generation
    const sources: RagChatSourceDto[] = chunks.map((r) => ({
      articleId: r.payload.articleId,
      articleTitle: r.payload.articleTitle,
      relevantChunk: r.payload.chunkText,
    }));

    this.logger.debug(
      `Chat [${conversationId}] answered with ${sources.length} sources`,
    );

    return { answer: result.text, sources, conversationId };
  }

  getHistory(conversationId: string): ConversationHistoryResponseDto {
    const messages = this.memory.get(conversationId) ?? [];
    return { conversationId, messages };
  }

  private buildPrompt(
    question: string,
    chunks: RagSearchResult[],
    history: ConversationMessage[],
  ): string {
    const lines: string[] = [
      'You are a helpful Knowledge Hub assistant.',
      'Answer ONLY using the provided context.',
      'If the answer is not in the context, say: "I don\'t have information about that in the knowledge base."',
      '',
    ];

    // Include the last HISTORY_WINDOW messages for multi-turn context
    const recentHistory = history.slice(-HISTORY_WINDOW);
    if (recentHistory.length > 0) {
      lines.push('--- Conversation History ---');
      for (const msg of recentHistory) {
        lines.push(
          `${msg.role === 'user' ? 'User' : 'Assistant'}: ${msg.content}`,
        );
      }
      lines.push('');
    }

    lines.push('--- Knowledge Base Context ---');
    if (chunks.length === 0) {
      lines.push('No relevant content found in the knowledge base.');
    } else {
      chunks.forEach((r, i) => {
        lines.push(`[${i + 1}] From: "${r.payload.articleTitle}"`);
        lines.push(r.payload.chunkText);
        lines.push('');
      });
    }

    lines.push('--- Question ---');
    lines.push(question);
    lines.push('');
    lines.push('Answer:');

    return lines.join('\n');
  }

  private getOrCreate(conversationId: string): ConversationMessage[] {
    if (!this.memory.has(conversationId)) {
      this.memory.set(conversationId, []);
    }
    return this.memory.get(conversationId)!;
  }

  private addMessage(
    conversationId: string,
    role: 'user' | 'assistant',
    content: string,
  ): void {
    const history = this.getOrCreate(conversationId);
    history.push({ role, content, timestamp: Date.now() });

    // Keep only the most recent maxMessages entries
    if (history.length > this.maxMessages) {
      history.splice(0, history.length - this.maxMessages);
    }
  }
}
