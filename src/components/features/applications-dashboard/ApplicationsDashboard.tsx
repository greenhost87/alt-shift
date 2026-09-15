import { SectionHeader } from '../../layout/section-header/SectionHeader';
import bannerStyles from '../../ui/banner/Banner.module.css';
import { Button } from '../../ui/button/Button';
import { CopyIcon, DeleteIcon, PlusIcon } from '../../ui/icon/Icon';
import { Progress } from '../../ui/progress/Progress';
import typographyStyles from '../../ui/text/Typography.module.css';
import cardStyles from './ApplicationCard.module.css';
import { useStoredApplications } from '../../../system/applications/storage';
import styles from './ApplicationsDashboard.module.css';

type ApplicationsDashboardProps = {
  applicationLimit: number;
  onCreate: () => void;
};

export function ApplicationsDashboard({ applicationLimit, onCreate }: ApplicationsDashboardProps) {
  const { applications, deleteApplication, status: storageStatus } = useStoredApplications();
  const applicationCount = applications.length;
  const copyApplication = (letter: string) => {
    void navigator.clipboard.writeText(letter);
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
        {storageStatus === 'loading' ? (
          <p className={styles['storageMessage']} role="status">
            Loading applications…
          </p>
        ) : null}
        {storageStatus === 'invalid' ? (
          <p className={styles['storageMessage']} role="alert">
            Saved applications could not be read. The stored data was left unchanged.
          </p>
        ) : null}
        {storageStatus === 'unavailable' ? (
          <p className={styles['storageMessage']} role="alert">
            Browser storage is unavailable. Changes cannot be saved.
          </p>
        ) : null}
        {storageStatus === 'ready' && applicationCount === 0 ? (
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
        {storageStatus !== 'loading' && applicationCount > 0 ? (
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
                    icon={<DeleteIcon />}
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
                      copyApplication(application.letter);
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
            accessibleLabel={`${applicationCount} of ${applicationLimit} applications generated`}
            current={applicationCount}
            total={applicationLimit}
          />
        </div>
      </section>
    </div>
  );
}
