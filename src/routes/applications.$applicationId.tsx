import { createFileRoute } from '@tanstack/react-router';
import { useShallow } from 'zustand/react/shallow';
import * as m from '../paraglide/messages.js';
import { ApplicationWorkspace } from '../components/features/application-generator/ApplicationGenerator';
import { NotFound } from '../components/layout/not-found/NotFound';
import { Shell } from '../components/layout/shell/Shell';
import { StorageStatusMessage } from '../components/layout/storage-status/StorageStatus';
import { useApplicationStore } from '../system/state/application';

export const Route = createFileRoute('/applications/$applicationId')({
  component: StoredApplicationPage,
  head: () => ({
    meta: [
      { title: 'Saved Cover Letter — Alt+Shift' },
      {
        content: 'Review a cover letter saved privately in your browser.',
        name: 'description',
      },
      { content: 'noindex, nofollow', name: 'robots' },
    ],
  }),
});

function StoredApplicationPage() {
  const { applicationId } = Route.useParams();
  const { applications, storageStatus } = useApplicationStore(
    useShallow((state) => ({
      applications: state.applications,
      storageStatus: state.storageStatus,
    })),
  );
  if (storageStatus === 'loading') {
    return (
      <Shell>
        <output aria-label={m.applications_loading()}>{m.applications_loading()}</output>
      </Shell>
    );
  }
  if (storageStatus === 'invalid' || storageStatus === 'unavailable') {
    return (
      <Shell>
        <StorageStatusMessage status={storageStatus} />
      </Shell>
    );
  }

  const application = applications.find((candidate) => candidate.id === applicationId);
  if (!application) return <NotFound />;

  return <ApplicationWorkspace application={application} />;
}
