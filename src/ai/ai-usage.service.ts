import { Injectable } from '@nestjs/common';

export interface UsageStats {
  totalRequests: number;
  byEndpoint: Record<string, number>;
  totalTokens: number;
  totalLatencyMs: number;
  avgLatencyMs: number;
}

@Injectable()
export class AiUsageService {
  private totalRequests = 0;
  private byEndpoint: Record<string, number> = {};
  private totalTokens = 0;
  private totalLatencyMs = 0;

  track(endpoint: string, tokens = 0, latencyMs = 0): void {
    this.totalRequests++;
    this.byEndpoint[endpoint] = (this.byEndpoint[endpoint] ?? 0) + 1;
    this.totalTokens += tokens;
    this.totalLatencyMs += latencyMs;
  }

  getStats(): UsageStats {
    return {
      totalRequests: this.totalRequests,
      byEndpoint: { ...this.byEndpoint },
      totalTokens: this.totalTokens,
      totalLatencyMs: this.totalLatencyMs,
      avgLatencyMs:
        this.totalRequests === 0
          ? 0
          : Math.round(this.totalLatencyMs / this.totalRequests),
    };
  }
}
