import { Outlet, createFileRoute } from '@tanstack/react-router';

export const Route = createFileRoute('/applications')({
  component: ApplicationsLayout,
  head: () => ({
    meta: [{ content: 'noindex, nofollow', name: 'robots' }],
  }),
});

function ApplicationsLayout() {
  return <Outlet />;
}
