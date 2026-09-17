import { useEffect } from 'react';
import { useShallow } from 'zustand/react/shallow';
import * as m from '../../../paraglide/messages.js';
import { SectionHeader } from '../../layout/section-header/SectionHeader';
import { GoalBanner } from '../../ui/banner/Banner';
import { ConfirmationDialog } from '../../ui/confirmation/ConfirmationDialog';
import { CreateButton } from '../../ui/button/CreateButton';
import { ApplicationCard, ApplicationCardPlaceholder } from './ApplicationCard';
import { ApplicationsEmptyState } from './ApplicationsEmptyState';
import { writeClipboardText } from '../../../system/clipboard/write';
import { useApplicationStore } from '../../../system/state/application';
import styles from './ApplicationsDashboard.module.css';

type ApplicationsDashboardProps = {
  onCreate: () => void;
};

type StorageStatus = 'loading' | 'ready' | 'invalid' | 'unavailable';

function renderStorageStatusMessage(status: StorageStatus) {
  if (status === 'invalid') {
    return (
      <p className={styles['storageMessage']} role="alert">
        {m.applications_storage_invalid()}
      </p>
    );
  }
  if (status === 'unavailable') {
    return (
      <p className={styles['storageMessage']} role="alert">
        {m.applications_storage_unavailable()}
      </p>
    );
  }
  return null;
}

function renderLoadingCards(status: StorageStatus) {
  if (status !== 'loading') return null;

  return (
    <output aria-label={m.applications_loading()} className={styles['loadingState']}>
      <span aria-hidden="true" className={styles['cardGrid']}>
        {[0, 1].map((index) => (
          <ApplicationCardPlaceholder key={index} />
        ))}
      </span>
    </output>
  );
}

function shouldShowEmptyState(status: StorageStatus, applicationCount: number) {
  return status === 'ready' && applicationCount === 0;
}

function shouldShowApplications(status: StorageStatus, applicationCount: number) {
  return status !== 'loading' && applicationCount > 0;
}

export function ApplicationsDashboard({ onCreate }: ApplicationsDashboardProps) {
  const { applicationLimit, applications, applicationCount, copyFeedbackTimeoutMs, storageStatus } =
    useApplicationStore(
      useShallow((state) => ({
        applicationLimit: state.config.applicationLimit,
        applications: state.applications,
        applicationCount: state.applicationCount,
        copyFeedbackTimeoutMs: state.config.copyFeedbackTimeoutMs,
        storageStatus: state.storageStatus,
      })),
    );
  const deleteApplication = useApplicationStore((state) => state.deleteApplication);
  const copyError = useApplicationStore((state) => state.dashboardCopyError);
  const setCopyError = useApplicationStore((state) => state.setDashboardCopyError);
  const pendingDeletion = useApplicationStore((state) => state.pendingDeletion);
  const setPendingDeletion = useApplicationStore((state) => state.setPendingDeletion);
  const resetDashboard = useApplicationStore((state) => state.resetDashboard);
  useEffect(() => resetDashboard, [resetDashboard]);
  const copyApplication = async (letter: string) => {
    const error = await writeClipboardText(letter);
    setCopyError(error);
    return !error;
  };

  return (
    <div className={styles['content']}>
      <ConfirmationDialog
        active={pendingDeletion !== null}
        title={m.delete_application_title()}
        description={m.delete_application_description()}
        onCancel={() => {
          setPendingDeletion(null);
        }}
        onConfirm={() => {
          if (pendingDeletion !== null) deleteApplication(pendingDeletion);
          setPendingDeletion(null);
        }}
      />
      <section className={styles['applications']}>
        <SectionHeader
          action={<CreateButton label={m.create_new()} onClick={onCreate} />}
          title={m.applications()}
        />
        {renderStorageStatusMessage(storageStatus)}
        {renderLoadingCards(storageStatus)}
        {copyError ? (
          <p className={styles['clipboardError']} role="alert">
            {copyError}
          </p>
        ) : null}
        {shouldShowEmptyState(storageStatus, applicationCount) ? (
          <ApplicationsEmptyState onCreate={onCreate} />
        ) : null}
        {shouldShowApplications(storageStatus, applicationCount) ? (
          <div className={styles['cardGrid']}>
            {applications.map((application) => (
              <ApplicationCard
                application={application}
                copyFeedbackTimeoutMs={copyFeedbackTimeoutMs}
                key={application.id}
                onCopy={copyApplication}
                onDelete={setPendingDeletion}
              />
            ))}
          </div>
        ) : null}
      </section>
      {applicationCount < applicationLimit ? (
        <GoalBanner
          current={applicationCount}
          description={m.goal_description()}
          onCreate={onCreate}
          total={applicationLimit}
        />
      ) : null}
    </div>
  );
}
