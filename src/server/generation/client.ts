import type { GenerationRequest } from '../../system/generation/schema';
import { GENERATION_API_URL, getGenerationApiToken } from './config';
import { buildGenerationPrompt } from './prompt';

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
  return fetchImplementation(options.url ?? GENERATION_API_URL, {
    method: 'POST',
    headers: {
      accept: 'text/event-stream',
      authorization: `Bearer ${options.token ?? getGenerationApiToken()}`,
      'content-type': 'application/json',
    },
    body: JSON.stringify({ prompt: buildGenerationPrompt(input) }),
    ...(options.signal ? { signal: options.signal } : {}),
  });
}
