import { createFileRoute } from '@tanstack/react-router';
import { ApplicationWorkspace } from '../components/features/application-generator/ApplicationGenerator';

export const Route = createFileRoute('/applications/new')({
  component: ApplicationGeneratorPage,
  head: () => ({
    meta: [
      { title: 'Create a Cover Letter — Alt+Shift' },
      {
        content: 'Create a personalized AI-assisted cover letter for your job application.',
        name: 'description',
      },
      { content: 'noindex, nofollow', name: 'robots' },
    ],
  }),
});

function ApplicationGeneratorPage() {
  return <ApplicationWorkspace />;
}
