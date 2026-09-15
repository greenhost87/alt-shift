import { createFileRoute } from '@tanstack/react-router';
import { ApplicationsDashboardScreen } from '../components/features/applications-dashboard/ApplicationsDashboard';

export const Route = createFileRoute('/')({
  component: ApplicationsDashboardScreen,
});
