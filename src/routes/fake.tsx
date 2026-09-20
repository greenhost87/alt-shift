import { createFileRoute, notFound } from '@tanstack/react-router';
import { ApplicationWorkspaceContainer } from '../application-workspace-container';
import { getDatabase } from '../server/database/connection';
import { handleGenerateRequest } from '../server/generation/handler';

const FAKE_LETTER = `Dear Hiring Team,

I am excited to apply for this test position. This application was generated locally by the fake endpoint, so no LLM request was made.

My experience and strengths would allow me to contribute effectively to the team. I would welcome the opportunity to discuss the role in more detail.

Thank you for considering my application.`;

function createFakeGenerationResponse(incomplete: boolean) {
  const completeEvent = `event: delta\ndata: ${JSON.stringify({ text: FAKE_LETTER })}\n\n`;
  const event = incomplete ? completeEvent.slice(0, -2) : completeEvent;
  return new Response(event, {
    headers: {
      'cache-control': 'no-cache, no-store',
      'content-type': 'text/event-stream; charset=utf-8',
      'x-generation-inactivity-timeout-ms': '30000',
    },
  });
}

export const Route = createFileRoute('/fake')({
  beforeLoad: () => {
    if (import.meta.env.PROD) notFound({ throw: true });
  },
  component: FakeApplicationGeneratorPage,
  head: () => ({
    meta: [
      { title: 'Cover Letter Generator Test — Alt+Shift' },
      { content: 'Test-only cover letter generator.', name: 'description' },
      { content: 'noindex, nofollow', name: 'robots' },
    ],
  }),
  server: {
    handlers: {
      POST: async ({ request }) => {
        if (import.meta.env.PROD) return new Response(null, { status: 404 });

        const response = await handleGenerateRequest(
          request,
          async () => {
            const incomplete = new URL(request.url).searchParams.has('incomplete');
            const generated = await Promise.resolve(createFakeGenerationResponse(incomplete));
            return generated;
          },
          () => undefined,
          undefined,
          getDatabase,
        );
        return response;
      },
    },
  },
});

function FakeApplicationGeneratorPage() {
  return <ApplicationWorkspaceContainer generationEndpoint="/fake" />;
}
