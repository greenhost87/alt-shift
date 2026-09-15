import { createFileRoute } from '@tanstack/react-router';
import { handleGenerateRequest } from '../server/generation/handler';

export const Route = createFileRoute('/api/generate')({
  server: {
    handlers: {
      POST: async ({ request }) => handleGenerateRequest(request),
    },
  },
});
