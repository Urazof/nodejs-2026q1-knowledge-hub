type SummarizeLength = 'short' | 'medium' | 'detailed';
type AnalyzeTask = 'review' | 'bugs' | 'optimize' | 'explain';

const SUMMARY_INSTRUCTION: Record<SummarizeLength, string> = {
  short: 'in 2-3 concise sentences',
  medium: 'in a single paragraph (5-7 sentences)',
  detailed:
    'with key points, main ideas, and important details (up to 10 sentences)',
};

export function buildSummarizePrompt(
  content: string,
  maxLength: SummarizeLength = 'medium',
): string {
  return (
    `Summarize the following article ${SUMMARY_INSTRUCTION[maxLength]}.\n` +
    `Return ONLY the summary text, no preamble or extra formatting.\n\n` +
    `ARTICLE:\n${content}`
  );
}

export function buildTranslatePrompt(
  content: string,
  targetLanguage: string,
  sourceLanguage?: string,
): string {
  const fromClause = sourceLanguage
    ? ` from ${sourceLanguage}`
    : ' (auto-detect source language)';

  return (
    `Translate the following text${fromClause} to ${targetLanguage}.\n` +
    `Return a JSON object with exactly these fields:\n` +
    `- "translatedText": the full translation\n` +
    `- "detectedLanguage": the detected or stated source language name in English\n\n` +
    `Return ONLY the JSON object, no markdown fences or extra text.\n\n` +
    `TEXT:\n${content}`
  );
}

const ANALYZE_INSTRUCTION: Record<AnalyzeTask, string> = {
  review:
    'Review the content and provide quality insights, improvement suggestions, and identify any issues.',
  bugs: 'Analyze the content for bugs, logical errors, factual mistakes, or inconsistencies.',
  optimize:
    'Suggest optimizations, improvements to clarity, structure, and efficiency.',
  explain:
    'Explain the content clearly, breaking down complex ideas for a general audience.',
};

export function buildAnalyzePrompt(
  content: string,
  task: AnalyzeTask = 'review',
): string {
  return (
    `${ANALYZE_INSTRUCTION[task]}\n\n` +
    `Return a JSON object with exactly these fields:\n` +
    `- "analysis": string with the main analysis result\n` +
    `- "suggestions": array of strings, each being a concrete improvement suggestion\n` +
    `- "severity": one of "info" | "warning" | "error" based on the overall assessment\n\n` +
    `Return ONLY the JSON object, no markdown fences or extra text.\n\n` +
    `CONTENT:\n${content}`
  );
}
