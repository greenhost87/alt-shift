import type { Page } from '@playwright/test';
import generationFixtures from '../fixtures/generation.json' with { type: 'json' };

declare global {
  interface Window {
    delayedGenerationResponse: (release: () => Promise<void>, content: string) => Response;
    finishInterruptedGenerationRetry: () => Promise<void>;
    generationResponse: (body: BodyInit) => Response;
    recordGenerationRequest: () => Promise<void>;
    recordInterruptedGenerationRequest: () => Promise<void>;
    recordTransportAttempt: () => Promise<void>;
    respondToGeneration: (init?: RequestInit) => Promise<Response> | Response;
    waitToFinishGeneration: () => Promise<void>;
    waitToInterruptGeneration: () => Promise<void>;
    generationFixtures: typeof generationFixtures;
  }
}

export async function installGenerationBrowserFixtures(page: Page) {
  await page.addInitScript((fixtures) => {
    window.generationFixtures = fixtures;
    window.generationResponse = (body) =>
      new Response(body, {
        headers: {
          'content-type': 'text/event-stream',
          'x-generation-inactivity-timeout-ms': '30000',
        },
        status: 200,
      });
    window.delayedGenerationResponse = (release, content) =>
      window.generationResponse(
        new ReadableStream({
          async start(controller) {
            await release();
            controller.enqueue(new TextEncoder().encode(content));
            controller.close();
          },
        }),
      );
    const nativeFetch = window.fetch;
    Object.defineProperty(window, 'fetch', {
      configurable: true,
      value: async (input: RequestInfo | URL, init?: RequestInit) => {
        const url = new URL(input instanceof Request ? input.url : input.toString(), location.href);
        if (url.pathname !== '/api/generate') return nativeFetch.call(window, input, init);
        return window.respondToGeneration(init);
      },
    });
  }, generationFixtures);
}
