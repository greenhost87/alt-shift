import { createFileRoute } from '@tanstack/react-router';
import { useShallow } from 'zustand/react/shallow';
import { ApplicationWorkspace } from '../components/features/application-generator/ApplicationGenerator';
import { NotFound } from '../components/layout/not-found/NotFound';
import { useApplicationStore } from '../system/state/application';

export const Route = createFileRoute('/applications/$applicationId')({
  component: StoredApplicationPage,
});

function StoredApplicationPage() {
  const { applicationId } = Route.useParams();
  const { applications, storageStatus } = useApplicationStore(
    useShallow((state) => ({
      applications: state.applications,
      storageStatus: state.storageStatus,
    })),
  );
  if (storageStatus === 'loading') return null;

  const application = applications.find((candidate) => candidate.id === applicationId);
  if (!application) return <NotFound />;

  return <ApplicationWorkspace application={application} />;
}
