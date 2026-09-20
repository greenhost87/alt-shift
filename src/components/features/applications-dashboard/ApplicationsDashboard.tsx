import type { ReactNode } from 'react';
import { GoalBanner, SubscriptionModal } from '../../ui/banner/Banner';
import { ConfirmationDialog } from '../../ui/confirmation/ConfirmationDialog';
import { CreateButton } from '../../ui/button/CreateButton';
import { Icon } from '../../ui/icon/Icon';
import { ApplicationCard, ApplicationCardPlaceholder } from './ApplicationCard';
import type { DashboardCardApplication } from './ApplicationCard';
import styles from './ApplicationsDashboard.module.css';

const DASHBOARD_STORAGE_STATUSES = ['loading', 'ready', 'invalid', 'unavailable'] as const;
type DashboardStorageStatus = (typeof DASHBOARD_STORAGE_STATUSES)[number];

type DashboardTexts = {
  loadingLabel: string;
  createFirst: string;
  noApplicationsYet: string;
  emptyDescription: string;
  goalDescription: string;
  deleteTitle: string;
  deleteDescription: string;
  deleteLabel: string;
};

type OpenLabelSource = {
  role: string;
  company: string;
};

type ApplicationsDashboardProps = {
  applications: DashboardCardApplication[];
  applicationCount: number;
  applicationLimit: number;
  copyError: string;
  copyFeedbackTimeoutMs: number;
  creationBlocked: boolean;
  getOpenLabel: (application: OpenLabelSource) => string;
  header: ReactNode;
  onCancelDelete: () => void;
  onCloseSubscription: () => void;
  onConfirmDelete: () => void;
  onCopy: (letter: string) => Promise<boolean>;
  onCreate: () => void;
  onDeleteRequest: (applicationId: string) => void;
  pendingDeletionActive: boolean;
  statusMessage: ReactNode;
  storageStatus: DashboardStorageStatus;
  subscriptionModalVisible: boolean;
  texts: DashboardTexts;
};

function renderLoadingCards(status: DashboardStorageStatus, loadingLabel: string) {
  if (status !== 'loading') return null;

  return (
    <output aria-label={loadingLabel} className={styles['loadingState']}>
      <span aria-hidden="true" className={styles['cardGrid']}>
        {[0, 1].map((index) => (
          <ApplicationCardPlaceholder key={index} />
        ))}
      </span>
    </output>
  );
}

function shouldShowEmptyState(status: DashboardStorageStatus, applicationCount: number) {
  return status === 'ready' && applicationCount === 0;
}

function shouldShowApplications(status: DashboardStorageStatus, applicationCount: number) {
  return status !== 'loading' && applicationCount > 0;
}

function renderClipboardError(copyError: string) {
  if (!copyError) return null;
  return (
    <p className={styles['clipboardError']} role="alert">
      {copyError}
    </p>
  );
}

function renderEmptyState(
  storageStatus: DashboardStorageStatus,
  applicationCount: number,
  creationBlocked: boolean,
  onCreate: () => void,
  texts: DashboardTexts,
) {
  if (!shouldShowEmptyState(storageStatus, applicationCount)) return null;
  return (
    <div className={styles['emptyState']}>
      <div aria-hidden="true" className={styles['visual']}>
        <Icon viewBox="0 0 64 64" strokeWidth={2}>
          <rect x="16" y="6" width="32" height="44" rx="4" />
          <path d="M24 17h16M24 25h16M24 33h8" />
          <path d="M8 30v24a4 4 0 0 0 4 4h40a4 4 0 0 0 4-4V30L32 46Z" />
        </Icon>
      </div>
      <div className={styles['copy']}>
        <h2 className={styles['title']}>{texts.noApplicationsYet}</h2>
        <p className={styles['description']}>{texts.emptyDescription}</p>
      </div>
      <div className={styles['action']}>
        <CreateButton
          disabled={creationBlocked}
          label={texts.createFirst}
          onClick={onCreate}
          prominent
        />
      </div>
    </div>
  );
}

function renderApplicationCards(
  storageStatus: DashboardStorageStatus,
  applicationCount: number,
  applications: DashboardCardApplication[],
  copyFeedbackTimeoutMs: number,
  deleteLabel: string,
  getOpenLabel: (application: OpenLabelSource) => string,
  onCopy: (letter: string) => Promise<boolean>,
  onDeleteRequest: (applicationId: string) => void,
) {
  if (!shouldShowApplications(storageStatus, applicationCount)) return null;
  return (
    <div className={styles['cardGrid']}>
      {applications.map((application) => (
        <ApplicationCard
          application={application}
          copyFeedbackTimeoutMs={copyFeedbackTimeoutMs}
          deleteLabel={deleteLabel}
          key={application.id}
          onCopy={onCopy}
          onDelete={onDeleteRequest}
          openLabel={getOpenLabel({ role: application.role, company: application.company })}
        />
      ))}
    </div>
  );
}

export function ApplicationsDashboard({
  applications,
  applicationCount,
  applicationLimit,
  copyError,
  copyFeedbackTimeoutMs,
  creationBlocked,
  getOpenLabel,
  header,
  onCancelDelete,
  onCloseSubscription,
  onConfirmDelete,
  onCopy,
  onCreate,
  onDeleteRequest,
  pendingDeletionActive,
  statusMessage,
  storageStatus,
  subscriptionModalVisible,
  texts,
}: ApplicationsDashboardProps) {
  return (
    <div className={styles['content']}>
      <ConfirmationDialog
        active={pendingDeletionActive}
        title={texts.deleteTitle}
        description={texts.deleteDescription}
        onCancel={onCancelDelete}
        onConfirm={onConfirmDelete}
      />
      <section className={styles['applications']}>
        {header}
        {statusMessage}
        {renderLoadingCards(storageStatus, texts.loadingLabel)}
        {renderClipboardError(copyError)}
        {renderEmptyState(storageStatus, applicationCount, creationBlocked, onCreate, texts)}
        {renderApplicationCards(
          storageStatus,
          applicationCount,
          applications,
          copyFeedbackTimeoutMs,
          texts.deleteLabel,
          getOpenLabel,
          onCopy,
          onDeleteRequest,
        )}
      </section>
      <GoalBanner
        current={applicationCount}
        description={texts.goalDescription}
        onCreate={onCreate}
        total={applicationLimit}
        visible={!creationBlocked}
      />
      <SubscriptionModal visible={subscriptionModalVisible} onClose={onCloseSubscription} />
    </div>
  );
}
