import type { GenerationRequest } from '../../system/generation/schema';
import {
  getGenerationApiToken,
  getGenerationApiUrl,
  getGenerationInactivityTimeoutMs,
  getGenerationMaxInputLength,
  getGenerationMaxTokens,
} from './config';
import { buildGenerationPrompt, GENERATION_SYSTEM_PROMPT } from './prompt';

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
  if (prompt.length + GENERATION_SYSTEM_PROMPT.length > getGenerationMaxInputLength()) {
    throw new GenerationRequestError('The generation request exceeds the text limit.');
  }
  const timeoutSignal = AbortSignal.timeout(getGenerationInactivityTimeoutMs());
  const signal = options.signal ? AbortSignal.any([options.signal, timeoutSignal]) : timeoutSignal;
  return fetchImplementation(options.url ?? getGenerationApiUrl(), {
    method: 'POST',
    headers: {
      accept: 'text/event-stream',
      authorization: `Bearer ${options.token ?? getGenerationApiToken()}`,
      'content-type': 'application/json',
    },
    body: JSON.stringify({
      system: GENERATION_SYSTEM_PROMPT,
      prompt,
      maxTokens: getGenerationMaxTokens(),
    }),
    signal,
  });
}
