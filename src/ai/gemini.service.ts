import {
  Injectable,
  InternalServerErrorException,
  Logger,
  ServiceUnavailableException,
} from '@nestjs/common';

export interface GeminiResult {
  text: string;
  promptTokens?: number;
  outputTokens?: number;
}

interface GeminiApiResponse {
  candidates?: Array<{
    content?: {
      parts?: Array<{ text?: string }>;
    };
  }>;
  usageMetadata?: {
    promptTokenCount?: number;
    candidatesTokenCount?: number;
  };
  error?: {
    code?: number;
    message?: string;
    status?: string;
  };
}

const GEMINI_TIMEOUT_MS = 30_000;
const MAX_RETRIES = 3;

@Injectable()
export class GeminiService {
  private readonly logger = new Logger(GeminiService.name);
  private readonly apiKey: string;
  private readonly baseUrl: string;
  private readonly model: string;

  constructor() {
    this.apiKey = process.env.GEMINI_API_KEY ?? '';
    this.baseUrl =
      process.env.GEMINI_API_BASE_URL ??
      'https://generativelanguage.googleapis.com';
    this.model = process.env.GEMINI_MODEL ?? 'gemini-2.5-flash';
  }

  async generateContent(prompt: string): Promise<GeminiResult> {
    return this.fetchWithRetry(prompt, 0);
  }

  private async fetchWithRetry(
    prompt: string,
    attempt: number,
  ): Promise<GeminiResult> {
    try {
      return await this.callApi(prompt);
    } catch (error) {
      if (attempt < MAX_RETRIES - 1 && this.isRetryable(error)) {
        const delayMs = Math.pow(2, attempt) * 1000;
        this.logger.warn(
          `Gemini request failed (attempt ${attempt + 1}), retrying in ${delayMs}ms`,
        );
        await this.sleep(delayMs);
        return this.fetchWithRetry(prompt, attempt + 1);
      }
      throw error;
    }
  }

  private async callApi(prompt: string): Promise<GeminiResult> {
    const url = `${this.baseUrl}/v1beta/models/${this.model}:generateContent?key=${this.apiKey}`;

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), GEMINI_TIMEOUT_MS);

    let response: Response;
    try {
      response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: { temperature: 0.7, maxOutputTokens: 2048 },
        }),
        signal: controller.signal,
      });
    } catch (err) {
      clearTimeout(timer);
      const message =
        err instanceof Error && err.name === 'AbortError'
          ? 'Gemini API request timed out'
          : 'Gemini API is unavailable';
      this.logger.error(message);
      throw new ServiceUnavailableException(message);
    }
    clearTimeout(timer);

    const body = (await response.json()) as GeminiApiResponse;

    if (!response.ok) {
      this.handleApiError(response.status, body.error?.message);
    }

    const text = body.candidates?.[0]?.content?.parts?.[0]?.text?.trim() ?? '';
    if (!text) {
      throw new ServiceUnavailableException(
        'Gemini returned an empty response',
      );
    }

    return {
      text,
      promptTokens: body.usageMetadata?.promptTokenCount,
      outputTokens: body.usageMetadata?.candidatesTokenCount,
    };
  }

  private handleApiError(status: number, apiMessage?: string): never {
    if (status === 401 || status === 403) {
      this.logger.error(`Gemini auth error: HTTP ${status}`);
      throw new InternalServerErrorException('AI service configuration error');
    }

    if (status === 429) {
      this.logger.warn('Gemini upstream rate limit hit');
      // Propagate as retryable — fetchWithRetry will handle it
      const err = new ServiceUnavailableException(
        'AI service is temporarily unavailable (rate limit)',
      );
      (err as unknown as Record<string, boolean>)['retryable'] = true;
      throw err;
    }

    this.logger.error(
      `Gemini API error: HTTP ${status} — ${apiMessage ?? 'unknown'}`,
    );
    throw new ServiceUnavailableException('AI service returned an error');
  }

  private isRetryable(error: unknown): boolean {
    if (!(error instanceof Error)) return false;
    if (error instanceof ServiceUnavailableException) {
      return (
        (error as unknown as Record<string, unknown>)['retryable'] === true
      );
    }
    return false;
  }

  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}
