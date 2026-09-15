import { useState } from 'react';
import { SectionHeader } from '../../layout/section-header/SectionHeader';
import bannerStyles from '../../ui/banner/Banner.module.css';
import { Button } from '../../ui/button/Button';
import { CopyIcon, Icon, PlusIcon } from '../../ui/icon/Icon';
import { Progress } from '../../ui/progress/Progress';
import typographyStyles from '../../ui/text/Typography.module.css';
import cardStyles from './ApplicationCard.module.css';
import { useStoredApplications } from '../../../system/applications/storage';
import { writeClipboardText } from '../../../system/clipboard/write';
import styles from './ApplicationsDashboard.module.css';

type ApplicationsDashboardProps = {
  onCreate: () => void;
};

const APPLICATION_LIMIT = 5;

type StorageStatus = 'loading' | 'ready' | 'invalid' | 'unavailable';

function renderStorageStatusMessage(status: StorageStatus) {
  if (status === 'loading') {
    return (
      <p className={styles['storageMessage']} role="status">
        Loading applications…
      </p>
    );
  }
  if (status === 'invalid') {
    return (
      <p className={styles['storageMessage']} role="alert">
        Saved applications could not be read. The stored data was left unchanged.
      </p>
    );
  }
  if (status === 'unavailable') {
    return (
      <p className={styles['storageMessage']} role="alert">
        Browser storage is unavailable. Changes cannot be saved.
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
  const { applications, deleteApplication, status: storageStatus } = useStoredApplications();
  const [copyError, setCopyError] = useState('');
  const applicationCount = applications.length;
  const copyApplication = async (letter: string) => {
    setCopyError(await writeClipboardText(letter));
  };

  return (
    <div className={styles['content']}>
      <section className={styles['applications']}>
        <SectionHeader
          action={
            <Button icon={<PlusIcon />} onClick={onCreate}>
              Create New
            </Button>
          }
          title="Applications"
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
              <PlusIcon />
            </div>
            <div className={styles['emptyStateCopy']}>
              <h2 className={styles['emptyStateTitle']}>No applications yet</h2>
              <p className={styles['emptyStateDescription']}>
                Create an application to start making progress toward your next role.
              </p>
            </div>
            <div className={styles['emptyStateAction']}>
              <Button icon={<PlusIcon />} onClick={onCreate} size="large">
                Create your first application
              </Button>
            </div>
          </div>
        ) : null}
        {shouldShowApplications(storageStatus, applicationCount) ? (
          <div className={styles['cardGrid']}>
            {applications.map((application) => (
              <article className={cardStyles['card']} key={application.id}>
                <div className={cardStyles['metadata']}>
                  <h3 className={cardStyles['title']}>
                    {application.role}, {application.company}
                  </h3>
                  <time className={cardStyles['date']} dateTime={application.createdAt}>
                    {new Date(application.createdAt).toLocaleDateString()}
                  </time>
                </div>
                <p className={cardStyles['letter']}>{application.letter}</p>
                <div aria-hidden="true" className={cardStyles['fade']} />
                <div className={cardStyles['actions']}>
                  <Button
                    icon={
                      <Icon viewBox="0 0 20 20">
                        <path d="M7.5 2.5h5m-8.33 3.33h11.66m-1.3 0-.58 9.23a1.67 1.67 0 0 1-1.66 1.57H7.7a1.67 1.67 0 0 1-1.66-1.57l-.58-9.23m2.87 3.34v4.16m3.34-4.16v4.16" />
                      </Icon>
                    }
                    onClick={() => {
                      deleteApplication(application.id);
                    }}
                    variant="ghost"
                  >
                    Delete
                  </Button>
                  <Button
                    icon={<CopyIcon />}
                    iconPosition="end"
                    onClick={() => {
                      void copyApplication(application.letter);
                    }}
                    variant="ghost"
                  >
                    Copy to clipboard
                  </Button>
                </div>
              </article>
            ))}
          </div>
        ) : null}
      </section>
      {applicationCount < APPLICATION_LIMIT ? (
        <section className={bannerStyles['banner']}>
          <div className={bannerStyles['content']}>
            <div className={bannerStyles['heading']}>
              <h2 className={bannerStyles['title']}>Hit your goal</h2>
              <p className={[bannerStyles['description'], typographyStyles['body']].join(' ')}>
                Generate and send out couple more job applications today to get hired faster
              </p>
              <Button icon={<PlusIcon />} onClick={onCreate} size="large">
                Create New
              </Button>
            </div>
            <Progress
              accessibleLabel={`${applicationCount} of ${APPLICATION_LIMIT} applications generated`}
              current={applicationCount}
              total={APPLICATION_LIMIT}
            />
          </div>
        </section>
      ) : null}
    </div>
  );
}
