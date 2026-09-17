import { createFileRoute, useNavigate } from '@tanstack/react-router';
import { ApplicationsDashboard } from '../components/features/applications-dashboard/ApplicationsDashboard';
import { Shell } from '../components/layout/shell/Shell';

export const Route = createFileRoute('/applications/')({
  component: ApplicationsDashboardPage,
  head: () => ({
    meta: [
      { title: 'Applications — Alt+Shift' },
      { content: 'Manage cover letters saved privately in your browser.', name: 'description' },
    ],
  }),
});

function ApplicationsDashboardPage() {
  const navigate = useNavigate();
  return (
    <Shell>
      <ApplicationsDashboard
        onCreate={() => {
          void navigate({ to: '/applications/new' });
        }}
      />
    </Shell>
  );
}
