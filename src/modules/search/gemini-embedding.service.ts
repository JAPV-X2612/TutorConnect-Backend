import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

/**
 * Thin wrapper around the Google Gemini text-embedding-004 API.
 * Produces 768-dimensional vectors with task-type-aware embeddings.
 *
 * @author TutorConnect Team
 * @version 1.0
 * @since 2026-05-01
 */
@Injectable()
export class GeminiEmbeddingService {
  private readonly logger = new Logger(GeminiEmbeddingService.name);
  private readonly apiKey: string;

  private static readonly MODEL = 'gemini-embedding-001';
  private static readonly BASE_URL =
    'https://generativelanguage.googleapis.com/v1beta/models';

  constructor(private readonly config: ConfigService) {
    this.apiKey = this.config.get<string>('GEMINI_API_KEY') ?? '';
  }

  /**
   * Generates a 768-dimensional embedding for the given text.
   *
   * @param text - The text to embed.
   * @param inputType - 'document' for indexed content; 'query' for search queries.
   * @returns Array of 768 floats.
   */
  async embed(text: string, inputType: 'document' | 'query' = 'document'): Promise<number[]> {
    const taskType =
      inputType === 'document' ? 'RETRIEVAL_DOCUMENT' : 'RETRIEVAL_QUERY';

    const url = `${GeminiEmbeddingService.BASE_URL}/${GeminiEmbeddingService.MODEL}:embedContent?key=${this.apiKey}`;

    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: `models/${GeminiEmbeddingService.MODEL}`,
        content: { parts: [{ text }] },
        taskType,
        outputDimensionality: 768,
      }),
    });

    if (!response.ok) {
      const body = await response.text();
      this.logger.error(`Gemini embedding error ${response.status}: ${body}`);
      throw new Error(`Gemini embedding failed with status ${response.status}`);
    }

    const json = (await response.json()) as { embedding: { values: number[] } };
    return json.embedding.values;
  }
}
