import { createFileRoute } from '@tanstack/react-router';
import { ApplicationWorkspace } from '../components/features/application-generator/ApplicationGenerator';
import { Shell } from '../components/layout/shell/Shell';

export const Route = createFileRoute('/applications/new')({
  component: ApplicationGeneratorPage,
});

function ApplicationGeneratorPage() {
  return (
    <Shell>
      <ApplicationWorkspace />
    </Shell>
  );
}
