import { createFileRoute, useNavigate } from '@tanstack/react-router';
import { useState } from 'react';
import {
  ApplicationEditor,
  ApplicationGenerator,
  ApplicationPreview,
} from '../components/features/application-generator/ApplicationGenerator';
import { Shell } from '../components/layout/shell/Shell';
import { GenerationStatus } from '../components/layout/shell/GenerationStatus';
import { HomeButton } from '../components/layout/shell/HomeButton';
import { Workspace } from '../components/layout/workspace/Workspace';

export const Route = createFileRoute('/applications/new')({
  component: ApplicationGeneratorPage,
});

const INITIAL_JOB_TITLE = 'Product manager';
const INITIAL_COMPANY = 'Apple';
const INITIAL_STRENGTHS = 'HTML, CSS and doing things in time';
const INITIAL_DETAILS =
  'I want to help you build awesome solutions to accomplish your goals and vision';

function ApplicationGeneratorPage() {
  const navigate = useNavigate();
  const [jobTitle, setJobTitle] = useState(INITIAL_JOB_TITLE);
  const [company, setCompany] = useState(INITIAL_COMPANY);
  const [strengths, setStrengths] = useState(INITIAL_STRENGTHS);
  const [details, setDetails] = useState(INITIAL_DETAILS);
  const [isLoading, setIsLoading] = useState(false);
  const hasApplicationTitle = jobTitle.trim().length > 0 && company.trim().length > 0;
  const applicationTitle = hasApplicationTitle ? `${jobTitle}, ${company}` : 'New application';
  const returnHome = () => {
    void navigate({ to: '/' });
  };

  return (
    <Shell
      action={<HomeButton onClick={returnHome} />}
      status={<GenerationStatus current={3} total={5} />}
    >
      <Workspace
        primary={
          <ApplicationEditor muted={!hasApplicationTitle} title={applicationTitle}>
            <ApplicationGenerator
              company={company}
              details={details}
              jobTitle={jobTitle}
              loading={isLoading}
              onCompanyChange={setCompany}
              onDetailsChange={setDetails}
              onGenerate={() => setIsLoading(true)}
              onJobTitleChange={setJobTitle}
              onStrengthsChange={setStrengths}
              strengths={strengths}
            />
          </ApplicationEditor>
        }
        secondary={<ApplicationPreview loading={isLoading} />}
      />
    </Shell>
  );
}
