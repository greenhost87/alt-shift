import { createFileRoute } from '@tanstack/react-router';
import { ApplicationWorkspace } from '../components/features/application-generator/ApplicationGenerator';

const FAKE_LETTER = `Dear Hiring Team,

I am excited to apply for this test position. This application was generated locally by the fake endpoint, so no LLM request was made.

My experience and strengths would allow me to contribute effectively to the team. I would welcome the opportunity to discuss the role in more detail.

Thank you for considering my application.`;

function createFakeGenerationResponse() {
  const event = `event: delta\ndata: ${JSON.stringify({ text: FAKE_LETTER })}\n\n`;
  return new Response(event, {
    headers: {
      'cache-control': 'no-cache, no-store',
      'content-type': 'text/event-stream; charset=utf-8',
      'x-generation-inactivity-timeout-ms': '30000',
    },
  });
}

export const Route = createFileRoute('/fake')({
  component: FakeApplicationGeneratorPage,
  server: {
    handlers: {
      POST: () => createFakeGenerationResponse(),
    },
  },
});

function FakeApplicationGeneratorPage() {
  return <ApplicationWorkspace generationEndpoint="/fake" />;
}
