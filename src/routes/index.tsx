import { createFileRoute, useNavigate } from '@tanstack/react-router';
import { Landing } from '../components/features/landing/Landing';
import { Shell } from '../components/layout/shell/Shell';

export const Route = createFileRoute('/')({
  component: LandingPage,
  head: () => ({
    meta: [
      { title: 'AI Cover Letter Generator — Alt+Shift' },
      {
        content: 'Generate a personalized cover letter for your next job application.',
        name: 'description',
      },
      {
        'script:ld+json': {
          '@context': 'https://schema.org',
          '@type': 'WebApplication',
          applicationCategory: 'BusinessApplication',
          description: 'AI-powered cover letter generator',
          name: 'Alt+Shift',
          operatingSystem: 'Web',
        },
      },
    ],
  }),
});

function LandingPage() {
  const navigate = useNavigate();
  const createApplication = () => {
    void navigate({ to: '/applications/new' });
  };
  return (
    <Shell>
      <Landing onCreate={createApplication} />
    </Shell>
  );
}
