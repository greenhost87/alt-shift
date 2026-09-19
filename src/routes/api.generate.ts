import { createFileRoute } from '@tanstack/react-router';
import { getDatabase } from '../server/database/connection';
import { handleGenerateRequest } from '../server/generation/handler';

export const Route = createFileRoute('/api/generate')({
  server: {
    handlers: {
      POST: async ({ request }) =>
        handleGenerateRequest(request, undefined, undefined, undefined, getDatabase),
    },
  },
});
