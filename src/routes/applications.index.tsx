import { createFileRoute, useNavigate } from '@tanstack/react-router';
import { useState } from 'react';
import { useShallow } from 'zustand/react/shallow';
import { ApplicationsDashboard } from '../components/features/applications-dashboard/ApplicationsDashboard';
import { SectionHeader } from '../components/layout/section-header/SectionHeader';
import { Shell } from '../components/layout/shell/Shell';
import { StorageStatusMessage } from '../components/layout/storage-status/StorageStatus';
import { Button } from '../components/ui/button/Button';
import { CreateButton } from '../components/ui/button/CreateButton';
import * as m from '../paraglide/messages.js';
import { writeClipboardText } from '../system/clipboard/write';
import { useApplicationConfig, usePersistenceStore } from '../system/state/application';
import { selectApplicationCount } from '../system/state/persistence-store';

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
  const config = useApplicationConfig();
  const { applicationLimit, copyFeedbackTimeoutMs } = config;
  const applicationCount = usePersistenceStore(selectApplicationCount);
  const { applications, serverApplicationLimitReached, storageStatus } = usePersistenceStore(
    useShallow((state) => ({
      applications: state.applications,
      serverApplicationLimitReached: state.serverApplicationLimitReached,
      storageStatus: state.storageStatus,
    })),
  );
  const deleteApplication = usePersistenceStore((state) => state.deleteApplication);
  const [copyError, setCopyError] = useState('');
  const [pendingDeletion, setPendingDeletion] = useState<string | null>(null);
  const [subscriptionModalVisible, setSubscriptionModalVisible] = useState(false);

  const creationBlocked = applicationCount >= applicationLimit || serverApplicationLimitReached;
  const copyApplication = async (letter: string) => {
    const error = await writeClipboardText(letter);
    setCopyError(error);
    return !error;
  };
  const createApplication = () => {
    void navigate({ to: '/applications/new' });
  };
  const headerAction = creationBlocked ? (
    <Button
      onClick={() => {
        setSubscriptionModalVisible(true);
      }}
    >
      {m.subscribe()}
    </Button>
  ) : (
    <CreateButton label={m.create_new()} onClick={createApplication} />
  );

  return (
    <Shell>
      <ApplicationsDashboard
        applications={applications}
        applicationCount={applicationCount}
        applicationLimit={applicationLimit}
        copyError={copyError}
        copyFeedbackTimeoutMs={copyFeedbackTimeoutMs}
        creationBlocked={creationBlocked}
        getOpenLabel={({ role, company }) => m.open_application({ role, company })}
        header={<SectionHeader action={headerAction} level="page" title={m.applications()} />}
        onCancelDelete={() => {
          setPendingDeletion(null);
        }}
        onCloseSubscription={() => {
          setSubscriptionModalVisible(false);
        }}
        onConfirmDelete={() => {
          if (pendingDeletion !== null) deleteApplication(pendingDeletion);
          setPendingDeletion(null);
        }}
        onCopy={copyApplication}
        onCreate={createApplication}
        onDeleteRequest={setPendingDeletion}
        pendingDeletionActive={pendingDeletion !== null}
        statusMessage={<StorageStatusMessage status={storageStatus} />}
        storageStatus={storageStatus}
        subscriptionModalVisible={subscriptionModalVisible}
        texts={{
          loadingLabel: m.applications_loading(),
          createFirst: m.create_first_application(),
          noApplicationsYet: m.no_applications_yet(),
          emptyDescription: m.empty_applications_description(),
          goalDescription: m.goal_description(),
          deleteTitle: m.delete_application_title(),
          deleteDescription: m.delete_application_description(),
          deleteLabel: m.delete(),
        }}
      />
    </Shell>
  );
}
