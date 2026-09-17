import { useEffect } from 'react';
import { useShallow } from 'zustand/react/shallow';
import * as m from '../../../paraglide/messages.js';
import { SectionHeader } from '../../layout/section-header/SectionHeader';
import { StorageStatusMessage } from '../../layout/storage-status/StorageStatus';
import { GoalBanner, SubscriptionModal } from '../../ui/banner/Banner';
import { Button } from '../../ui/button/Button';
import { ConfirmationDialog } from '../../ui/confirmation/ConfirmationDialog';
import { CreateButton } from '../../ui/button/CreateButton';
import { Icon } from '../../ui/icon/Icon';
import { ApplicationCard, ApplicationCardPlaceholder } from './ApplicationCard';
import { writeClipboardText } from '../../../system/clipboard/write';
import { useApplicationStore } from '../../../system/state/application';
import type { StorageStatus } from '../../../system/state/application-store';
import styles from './ApplicationsDashboard.module.css';

type ApplicationsDashboardProps = {
  onCreate: () => void;
};

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

function renderCreateAction(
  creationBlocked: boolean,
  onCreate: () => void,
  onSubscribe: () => void,
) {
  if (creationBlocked) return <Button onClick={onSubscribe}>{m.subscribe()}</Button>;
  return <CreateButton label={m.create_new()} onClick={onCreate} />;
}

export function ApplicationsDashboard({ onCreate }: ApplicationsDashboardProps) {
  const {
    applicationLimit,
    applications,
    applicationCount,
    copyFeedbackTimeoutMs,
    serverApplicationLimitReached,
    storageStatus,
    subscriptionModalVisible,
    showSubscriptionModal,
    hideSubscriptionModal,
  } = useApplicationStore(
    useShallow((state) => ({
      applicationLimit: state.config.applicationLimit,
      applications: state.applications,
      applicationCount: state.applicationCount,
      copyFeedbackTimeoutMs: state.config.copyFeedbackTimeoutMs,
      serverApplicationLimitReached: state.serverApplicationLimitReached,
      storageStatus: state.storageStatus,
      subscriptionModalVisible: state.subscriptionModalVisible,
      showSubscriptionModal: state.showSubscriptionModal,
      hideSubscriptionModal: state.hideSubscriptionModal,
    })),
  );
  const deleteApplication = useApplicationStore((state) => state.deleteApplication);
  const copyError = useApplicationStore((state) => state.dashboardCopyError);
  const setCopyError = useApplicationStore((state) => state.setDashboardCopyError);
  const pendingDeletion = useApplicationStore((state) => state.pendingDeletion);
  const setPendingDeletion = useApplicationStore((state) => state.setPendingDeletion);
  const resetDashboard = useApplicationStore((state) => state.resetDashboard);
  useEffect(() => resetDashboard, [resetDashboard]);
  const creationBlocked = applicationCount >= applicationLimit || serverApplicationLimitReached;
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
          action={renderCreateAction(creationBlocked, onCreate, showSubscriptionModal)}
          level="section"
          title={m.applications()}
        />
        <StorageStatusMessage status={storageStatus} />
        {renderLoadingCards(storageStatus)}
        {copyError ? (
          <p className={styles['clipboardError']} role="alert">
            {copyError}
          </p>
        ) : null}
        {shouldShowEmptyState(storageStatus, applicationCount) ? (
          <div className={styles['emptyState']}>
            <div aria-hidden="true" className={styles['visual']}>
              <Icon viewBox="0 0 64 64" strokeWidth={2}>
                <rect x="16" y="6" width="32" height="44" rx="4" />
                <path d="M24 17h16M24 25h16M24 33h8" />
                <path d="M8 30v24a4 4 0 0 0 4 4h40a4 4 0 0 0 4-4V30L32 46Z" />
              </Icon>
            </div>
            <div className={styles['copy']}>
              <h2 className={styles['title']}>{m.no_applications_yet()}</h2>
              <p className={styles['description']}>{m.empty_applications_description()}</p>
            </div>
            <div className={styles['action']}>
              <CreateButton
                disabled={creationBlocked}
                label={m.create_first_application()}
                onClick={onCreate}
                prominent
              />
            </div>
          </div>
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
      {!creationBlocked ? (
        <GoalBanner
          current={applicationCount}
          description={m.goal_description()}
          onCreate={onCreate}
          total={applicationLimit}
        />
      ) : null}
      <SubscriptionModal active={subscriptionModalVisible} onClose={hideSubscriptionModal} />
    </div>
  );
}
