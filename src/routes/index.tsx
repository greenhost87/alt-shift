import { createFileRoute, useNavigate } from '@tanstack/react-router';
import { Landing } from '../components/features/landing/Landing';
import { Shell } from '../components/layout/shell/Shell';
import { PUBLIC_SITE_URL } from '../system/config/environment';

export const Route = createFileRoute('/')({
  component: LandingPage,
  head: () => ({
    links: [{ href: `${PUBLIC_SITE_URL}/`, rel: 'canonical' }],
    meta: [
      { title: 'AI Cover Letter Generator — Alt+Shift' },
      {
        content: 'Generate a personalized cover letter for your next job application.',
        name: 'description',
      },
      { content: 'Alt+Shift', property: 'og:site_name' },
      { content: 'website', property: 'og:type' },
      { content: 'AI Cover Letter Generator — Alt+Shift', property: 'og:title' },
      {
        content: 'Generate a personalized cover letter for your next job application.',
        property: 'og:description',
      },
      { content: `${PUBLIC_SITE_URL}/`, property: 'og:url' },
      { content: `${PUBLIC_SITE_URL}/og-cover.png`, property: 'og:image' },
      { content: 'Alt+Shift AI Cover Letter Generator', property: 'og:image:alt' },
      { content: '1200', property: 'og:image:width' },
      { content: '630', property: 'og:image:height' },
      { content: 'summary_large_image', name: 'twitter:card' },
      { content: 'AI Cover Letter Generator — Alt+Shift', name: 'twitter:title' },
      {
        content: 'Generate a personalized cover letter for your next job application.',
        name: 'twitter:description',
      },
      { content: `${PUBLIC_SITE_URL}/og-cover.png`, name: 'twitter:image' },
      { content: 'Alt+Shift AI Cover Letter Generator', name: 'twitter:image:alt' },
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
