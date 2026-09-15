import { Link } from '@tanstack/react-router';
import { useEffect } from 'react';
import * as m from '../../../paraglide/messages.js';
import { SectionHeader } from '../../layout/section-header/SectionHeader';
import { GoalBanner } from '../../ui/banner/Banner';
import { Button } from '../../ui/button/Button';
import { ConfirmationDialog } from '../../ui/confirmation/ConfirmationDialog';
import { CopyButton } from '../../ui/button/CopyButton';
import { CreateButton } from '../../ui/button/CreateButton';
import { Icon } from '../../ui/icon/Icon';
import cardStyles from './ApplicationCard.module.css';
import { writeClipboardText } from '../../../system/clipboard/write';
import { useApplicationStore } from '../../../system/state/application';
import styles from './ApplicationsDashboard.module.css';

type ApplicationsDashboardProps = {
  onCreate: () => void;
};

type StorageStatus = 'loading' | 'ready' | 'invalid' | 'unavailable';

function renderStorageStatusMessage(status: StorageStatus) {
  if (status === 'loading') {
    return <output className={styles['storageMessage']}>{m.applications_loading()}</output>;
  }
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

function shouldShowEmptyState(status: StorageStatus, applicationCount: number) {
  return status === 'ready' && applicationCount === 0;
}

function shouldShowApplications(status: StorageStatus, applicationCount: number) {
  return status !== 'loading' && applicationCount > 0;
}

export function ApplicationsDashboard({ onCreate }: ApplicationsDashboardProps) {
  const applicationLimit = useApplicationStore((state) => state.config.applicationLimit);
  const applications = useApplicationStore((state) => state.applications);
  const storageStatus = useApplicationStore((state) => state.storageStatus);
  const deleteApplication = useApplicationStore((state) => state.deleteApplication);
  const copyError = useApplicationStore((state) => state.dashboardCopyError);
  const setCopyError = useApplicationStore((state) => state.setDashboardCopyError);
  const pendingDeletion = useApplicationStore((state) => state.pendingDeletion);
  const setPendingDeletion = useApplicationStore((state) => state.setPendingDeletion);
  const resetDashboard = useApplicationStore((state) => state.resetDashboard);
  useEffect(() => resetDashboard, [resetDashboard]);
  const applicationCount = applications.length;
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
        {copyError ? (
          <p className={styles['clipboardError']} role="alert">
            {copyError}
          </p>
        ) : null}
        {shouldShowEmptyState(storageStatus, applicationCount) ? (
          <div className={styles['emptyState']}>
            <div aria-hidden="true" className={styles['emptyStateVisual']}>
              <Icon viewBox="0 0 64 64" strokeWidth={2}>
                <rect x="16" y="6" width="32" height="44" rx="4" />
                <path d="M24 17h16M24 25h16M24 33h8" />
                <path d="M8 30v24a4 4 0 0 0 4 4h40a4 4 0 0 0 4-4V30L32 46Z" />
              </Icon>
            </div>
            <div className={styles['emptyStateCopy']}>
              <h2 className={styles['emptyStateTitle']}>{m.no_applications_yet()}</h2>
              <p className={styles['emptyStateDescription']}>
                {m.empty_applications_description()}
              </p>
            </div>
            <div className={styles['emptyStateAction']}>
              <CreateButton label={m.create_first_application()} onClick={onCreate} prominent />
            </div>
          </div>
        ) : null}
        {shouldShowApplications(storageStatus, applicationCount) ? (
          <div className={styles['cardGrid']}>
            {applications.map((application) => (
              <article className={cardStyles['card']} key={application.id}>
                <Link
                  aria-label={m.open_application({
                    role: application.role,
                    company: application.company,
                  })}
                  className={cardStyles['detailsLink']}
                  params={{ applicationId: application.id }}
                  to="/applications/$applicationId"
                >
                  <p className={cardStyles['letter']}>{application.letter}</p>
                  <div aria-hidden="true" className={cardStyles['fade']} />
                </Link>
                <div className={cardStyles['actions']}>
                  <Button
                    icon={
                      <Icon viewBox="0 0 20 20">
                        <path d="M7.5 2.5h5m-8.33 3.33h11.66m-1.3 0-.58 9.23a1.67 1.67 0 0 1-1.66 1.57H7.7a1.67 1.67 0 0 1-1.66-1.57l-.58-9.23m2.87 3.34v4.16m3.34-4.16v4.16" />
                      </Icon>
                    }
                    onClick={() => {
                      setPendingDeletion(application.id);
                    }}
                    variant="ghost"
                  >
                    {m.delete()}
                  </Button>
                  <CopyButton onClick={async () => copyApplication(application.letter)} />
                </div>
              </article>
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
