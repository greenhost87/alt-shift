import type { GenerationRequest } from '../../system/generation/schema';
import { GENERATION_API_URL, getGenerationApiToken } from './config';
import { buildGenerationPrompt, GENERATION_SYSTEM_PROMPT } from './prompt';

const MAX_GENERATION_TOKENS = 1_500;
const MAX_UPSTREAM_TEXT_LENGTH = 23_000;

export class GenerationRequestError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'GenerationRequestError';
  }
}

type GenerationClientOptions = {
  fetch?: typeof globalThis.fetch;
  signal?: AbortSignal;
  token?: string;
  url?: string;
};

export async function requestGeneration(
  input: GenerationRequest,
  options: GenerationClientOptions = {},
) {
  const fetchImplementation = options.fetch ?? globalThis.fetch;
  const prompt = buildGenerationPrompt(input);
  if (prompt.length + GENERATION_SYSTEM_PROMPT.length > MAX_UPSTREAM_TEXT_LENGTH) {
    throw new GenerationRequestError('The generation request exceeds the text limit.');
  }
  return fetchImplementation(options.url ?? GENERATION_API_URL, {
    method: 'POST',
    headers: {
      accept: 'text/event-stream',
      authorization: `Bearer ${options.token ?? getGenerationApiToken()}`,
      'content-type': 'application/json',
    },
    body: JSON.stringify({
      system: GENERATION_SYSTEM_PROMPT,
      prompt,
      maxTokens: MAX_GENERATION_TOKENS,
    }),
    ...(options.signal ? { signal: options.signal } : {}),
  });
}
