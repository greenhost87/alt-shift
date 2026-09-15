import type { ReactNode } from 'react';
import { SectionHeader } from '../../layout/section-header/SectionHeader';
import { Button } from '../../ui/button/Button';
import { TextAreaField } from '../../ui/field/TextAreaField';
import { TextField } from '../../ui/field/TextField';
import { CopyIcon } from '../../ui/icon/Icon';
import styles from './ApplicationGenerator.module.css';

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

export function ApplicationGenerator({
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

type ApplicationEditorProps = {
  children: ReactNode;
  muted: boolean;
  title: string;
};

export function ApplicationEditor({ children, muted, title }: ApplicationEditorProps) {
  return (
    <div className={styles['editor']}>
      <SectionHeader level="section" muted={muted} title={title} />
      {children}
    </div>
  );
}

type ApplicationPreviewProps = {
  loading: boolean;
};

export function ApplicationPreview({ loading }: ApplicationPreviewProps) {
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
