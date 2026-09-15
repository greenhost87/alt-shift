import { createFileRoute, useNavigate } from '@tanstack/react-router';
import { ApplicationsDashboard } from '../components/features/applications-dashboard/ApplicationsDashboard';
import { Shell } from '../components/layout/shell/Shell';

export const Route = createFileRoute('/')({
  component: ApplicationsDashboardPage,
});

function ApplicationsDashboardPage() {
  const navigate = useNavigate();
  const createApplication = () => {
    void navigate({ to: '/applications/new' });
  };
  return (
    <Shell>
      <ApplicationsDashboard onCreate={createApplication} />
    </Shell>
  );
}
