import { createFileRoute, notFound } from '@tanstack/react-router';
import { NotFound } from '../components/layout/not-found/NotFound';

export const Route = createFileRoute('/$')({
  component: NotFound,
  head: () => ({
    meta: [
      { title: 'Page Not Found — Alt+Shift' },
      { content: 'The requested page could not be found.', name: 'description' },
      { content: 'noindex, nofollow', name: 'robots' },
    ],
  }),
  loader: () => notFound(),
});
