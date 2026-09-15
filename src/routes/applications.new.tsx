import { createFileRoute } from '@tanstack/react-router';
import { ApplicationWorkspace } from '../components/features/application-generator/ApplicationGenerator';

export const Route = createFileRoute('/applications/new')({
  component: ApplicationGeneratorPage,
});

function ApplicationGeneratorPage() {
  return <ApplicationWorkspace />;
}
