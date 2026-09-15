import type { Application } from './ApplicationCard';
import { ApplicationCard } from './ApplicationCard';
import { CardGrid } from '../../layout/card-grid/CardGrid';
import { SectionHeader } from '../../layout/section-header/SectionHeader';
import { Banner } from '../../ui/banner/Banner';
import { Button } from '../../ui/button/Button';
import { PlusIcon } from '../../ui/icon/Icon';
import { Progress } from '../../ui/progress/Progress';
import styles from './ApplicationsDashboard.module.css';

type ApplicationsDashboardProps = {
  applicationLimit: number;
  applications: Application[];
  onCopy: (letter: string) => void;
  onCreate: () => void;
  onDelete: (id: string) => void;
};

export function ApplicationsDashboard({
  applicationLimit,
  applications,
  onCopy,
  onCreate,
  onDelete,
}: ApplicationsDashboardProps) {
  const applicationCount = applications.length;

  return (
    <div className={styles['content']}>
      <section className={styles['applications']}>
        <SectionHeader
          action={
            <Button icon={<PlusIcon />} onClick={onCreate} type="button">
              Create New
            </Button>
          }
          title="Applications"
        />
        <CardGrid>
          {applications.map((application) => (
            <ApplicationCard
              key={application.id}
              letter={application.letter}
              onCopy={() => onCopy(application.letter)}
              onDelete={() => onDelete(application.id)}
            />
          ))}
        </CardGrid>
      </section>
      <Banner
        action={
          <Button icon={<PlusIcon />} onClick={onCreate} size="large" type="button">
            Create New
          </Button>
        }
        description="Generate and send out couple more job applications today to get hired faster"
        footer={
          <Progress
            accessibleLabel={`${applicationCount} of ${applicationLimit} applications generated`}
            current={applicationCount}
            total={applicationLimit}
          />
        }
        title="Hit your goal"
      />
    </div>
  );
}
