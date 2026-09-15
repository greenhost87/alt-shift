import { useNavigate } from '@tanstack/react-router';
import { useState } from 'react';
import { ApplicationCard } from './ApplicationCard';
import { CardGrid } from '../../layout/card-grid/CardGrid';
import { SectionHeader } from '../../layout/section-header/SectionHeader';
import { Shell } from '../../layout/shell/Shell';
import { Banner } from '../../ui/banner/Banner';
import { Button } from '../../ui/button/Button';
import { HomeIcon, PlusIcon } from '../../ui/icon/Icon';
import { ProgressDots } from '../../ui/progress/Dots';
import { Progress } from '../../ui/progress/Progress';
import styles from './ApplicationsDashboard.module.css';

const APPLICATION_LIMIT = 5;
const APPLICATION_LETTER = `Dear Stripe team,
I am a highly skilled product designer with a passion for creating intuitive, user-centered designs. I have a strong background in design systems and am excited about the opportunity to join the Stripe product design team and work on building out the design system for the platform.
I am particularly drawn to Stripe's mission of making it easy for businesses to sell online and am confident that my experience in creating user-friendly designs will be an asset to the team. I have experience in conducting user research, creating wireframes, and prototyping interactive designs, as well as working closely with engineers to ensure that my designs are implemented correctly.
I am a strong collaborator and have experience working in cross-functional teams to bring new products and features to market. I'm confident that I can help improve Stripe's user experience and make it even more accessible to businesses.
I would love the opportunity to speak with you further about my qualifications and how I can contribute to the Stripe team. Thank you for considering my application.`;

type Application = {
  id: string;
  letter: string;
};

const INITIAL_APPLICATIONS: Application[] = [
  { id: 'stripe-product-designer-1', letter: APPLICATION_LETTER },
  { id: 'stripe-product-designer-2', letter: APPLICATION_LETTER },
  { id: 'stripe-product-designer-3', letter: APPLICATION_LETTER },
];

export function ApplicationsDashboardScreen() {
  const navigate = useNavigate();
  const [applications, setApplications] = useState(INITIAL_APPLICATIONS);
  const applicationCount = applications.length;
  const createApplication = () => {
    void navigate({ to: '/applications/new' });
  };
  const returnHome = () => {
    void navigate({ to: '/' });
  };
  const deleteApplication = (id: string) => {
    setApplications((currentApplications) =>
      currentApplications.filter((application) => application.id !== id),
    );
  };
  const copyApplication = (letter: string) => {
    void navigator.clipboard.writeText(letter);
  };

  return (
    <Shell
      action={
        <Button
          ariaLabel="Home"
          icon={<HomeIcon />}
          onClick={returnHome}
          size="icon"
          type="button"
          variant="secondary"
        />
      }
      status={
        <>
          <span>
            {applicationCount}/{APPLICATION_LIMIT} applications generated
          </span>
          <ProgressDots
            accessibleLabel={`${applicationCount} of ${APPLICATION_LIMIT} applications generated`}
            current={applicationCount}
            total={APPLICATION_LIMIT}
          />
        </>
      }
    >
      <div className={styles['content']}>
        <section className={styles['applications']}>
          <SectionHeader
            action={
              <Button icon={<PlusIcon />} onClick={createApplication} type="button">
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
                onCopy={() => copyApplication(application.letter)}
                onDelete={() => deleteApplication(application.id)}
              />
            ))}
          </CardGrid>
        </section>
        <Banner
          action={
            <Button icon={<PlusIcon />} onClick={createApplication} size="large" type="button">
              Create New
            </Button>
          }
          description="Generate and send out couple more job applications today to get hired faster"
          footer={
            <Progress
              accessibleLabel={`${applicationCount} of ${APPLICATION_LIMIT} applications generated`}
              current={applicationCount}
              total={APPLICATION_LIMIT}
            />
          }
          title="Hit your goal"
        />
      </div>
    </Shell>
  );
}
