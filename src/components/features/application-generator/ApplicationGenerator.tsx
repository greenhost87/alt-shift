import { useNavigate } from '@tanstack/react-router';
import { useState } from 'react';
import { SectionHeader } from '../../layout/section-header/SectionHeader';
import { Shell } from '../../layout/shell/Shell';
import { Workspace } from '../../layout/workspace/Workspace';
import { Button } from '../../ui/button/Button';
import { TextAreaField } from '../../ui/field/TextAreaField';
import { TextField } from '../../ui/field/TextField';
import { CopyIcon, HomeIcon } from '../../ui/icon/Icon';
import { ProgressDots } from '../../ui/progress/Dots';
import styles from './ApplicationGenerator.module.css';

const INITIAL_JOB_TITLE = 'Product manager';
const INITIAL_COMPANY = 'Apple';
const INITIAL_STRENGTHS = 'HTML, CSS and doing things in time';
const INITIAL_DETAILS =
  'I want to help you build awesome solutions to accomplish your goals and vision';

type ApplicationGeneratorProps = {
  company: string;
  details: string;
  jobTitle: string;
  loading: boolean;
  onCompanyChange: (value: string) => void;
  onDetailsChange: (value: string) => void;
  onGenerate: () => void;
  onJobTitleChange: (value: string) => void;
  onStrengthsChange: (value: string) => void;
  strengths: string;
};

export function ApplicationGeneratorScreen() {
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
          <span>3/5 applications generated</span>
          <ProgressDots accessibleLabel="3 of 5 applications generated" current={3} total={5} />
        </>
      }
    >
      <Workspace
        primary={
          <div className={styles['editor']}>
            <SectionHeader level="section" muted={!hasApplicationTitle} title={applicationTitle} />
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
          </div>
        }
        secondary={<ApplicationPreview loading={isLoading} />}
      />
    </Shell>
  );
}

function ApplicationGenerator({
  company,
  details,
  jobTitle,
  loading,
  onCompanyChange,
  onDetailsChange,
  onGenerate,
  onJobTitleChange,
  onStrengthsChange,
  strengths,
}: ApplicationGeneratorProps) {
  const canGenerate =
    jobTitle.trim().length > 0 &&
    company.trim().length > 0 &&
    strengths.trim().length > 0 &&
    details.trim().length > 0;

  return (
    <form
      className={styles['form']}
      onSubmit={(event) => {
        event.preventDefault();
        onGenerate();
      }}
    >
      <div className={styles['fieldRow']}>
        <TextField
          id="job-title"
          label="Job title"
          name="jobTitle"
          onChange={onJobTitleChange}
          value={jobTitle}
        />
        <TextField
          id="company"
          label="Company"
          name="company"
          onChange={onCompanyChange}
          value={company}
        />
      </div>
      <TextField
        id="strengths"
        label="I am good at..."
        name="strengths"
        onChange={onStrengthsChange}
        value={strengths}
      />
      <TextAreaField
        autoFocus
        hint={`${details.length}/1200`}
        id="details"
        label="Additional details"
        maxLength={1200}
        name="details"
        onChange={onDetailsChange}
        placeholder="Describe why you are a great fit or paste your bio"
        value={details}
      />
      <Button disabled={!canGenerate} fullWidth loading={loading} size="large" type="submit">
        Generate Now
      </Button>
    </form>
  );
}

type ApplicationPreviewProps = {
  loading: boolean;
};

function ApplicationPreview({ loading }: ApplicationPreviewProps) {
  const copyEmptyApplication = () => {
    void navigator.clipboard.writeText('');
  };

  if (loading) {
    return (
      <div aria-label="Generating application" className={styles['loadingPreview']} role="status">
        <div className={styles['orb']}>
          <span className={styles['orbGlow']} />
          <span className={styles['orbCore']} />
        </div>
      </div>
    );
  }

  return (
    <div className={styles['preview']}>
      <p className={styles['placeholder']}>Your personalized job application will appear here...</p>
      <div className={styles['previewAction']}>
        <Button
          icon={<CopyIcon />}
          iconPosition="end"
          onClick={copyEmptyApplication}
          size="compact"
          type="button"
          variant="ghost"
        >
          Copy to clipboard
        </Button>
      </div>
    </div>
  );
}
