import { useState } from 'react';
import { SectionHeader } from '../../layout/section-header/SectionHeader';
import { Workspace } from '../../layout/workspace/Workspace';
import { Button } from '../../ui/button/Button';
import { TextAreaField } from '../../ui/field/TextAreaField';
import { TextField } from '../../ui/field/TextField';
import { CopyIcon } from '../../ui/icon/Icon';
import typographyStyles from '../../ui/text/Typography.module.css';
import styles from './ApplicationGenerator.module.css';

const DETAILS_LIMIT = 1200;
const INITIAL_JOB_TITLE = 'Product manager';
const INITIAL_COMPANY = 'Apple';
const INITIAL_STRENGTHS = 'HTML, CSS and doing things in time';
const INITIAL_DETAILS =
  'I want to help you build awesome solutions to accomplish your goals and vision';

function canGenerateApplication(
  jobTitle: string,
  company: string,
  strengths: string,
  details: string,
) {
  return (
    jobTitle.trim().length > 0 &&
    company.trim().length > 0 &&
    strengths.trim().length > 0 &&
    details.trim().length > 0 &&
    details.length <= DETAILS_LIMIT
  );
}

export function ApplicationWorkspace() {
  const [jobTitle, setJobTitle] = useState(INITIAL_JOB_TITLE);
  const [company, setCompany] = useState(INITIAL_COMPANY);
  const [strengths, setStrengths] = useState(INITIAL_STRENGTHS);
  const [details, setDetails] = useState(INITIAL_DETAILS);
  const [isLoading, setIsLoading] = useState(false);
  const detailsLength = details.length;
  const canGenerate = canGenerateApplication(jobTitle, company, strengths, details);
  const hasApplicationTitle = jobTitle.trim().length > 0 && company.trim().length > 0;
  const applicationTitle = hasApplicationTitle ? `${jobTitle}, ${company}` : 'New application';
  const copyEmptyApplication = () => {
    void navigator.clipboard.writeText('');
  };

  return (
    <Workspace
      primary={
        <div className={styles['editor']}>
          <SectionHeader level="section" muted={!hasApplicationTitle} title={applicationTitle} />
          <form
            className={styles['form']}
            onSubmit={(event) => {
              event.preventDefault();
              setIsLoading(true);
            }}
          >
            <div className={styles['fieldRow']}>
              <TextField
                id="job-title"
                label="Job title"
                name="jobTitle"
                onChange={setJobTitle}
                value={jobTitle}
              />
              <TextField
                id="company"
                label="Company"
                name="company"
                onChange={setCompany}
                value={company}
              />
            </div>
            <TextField
              id="strengths"
              label="I am good at..."
              name="strengths"
              onChange={setStrengths}
              value={strengths}
            />
            <TextAreaField
              autoFocus
              characterLimit={DETAILS_LIMIT}
              hint={`${detailsLength}/${DETAILS_LIMIT}`}
              id="details"
              label="Additional details"
              name="details"
              onChange={setDetails}
              placeholder="Describe why you are a great fit or paste your bio"
              value={details}
            />
            <Button
              disabled={!canGenerate}
              fullWidth
              loading={isLoading ? true : undefined}
              size="large"
              type="submit"
            >
              Generate Now
            </Button>
          </form>
        </div>
      }
      secondary={
        isLoading ? (
          <div
            aria-label="Generating application"
            className={styles['loadingPreview']}
            role="status"
          >
            <div className={styles['orb']}>
              <span className={styles['orbGlow']} />
              <span className={styles['orbCore']} />
            </div>
          </div>
        ) : (
          <div className={styles['preview']}>
            <p className={[styles['placeholder'], typographyStyles['body']].join(' ')}>
              Your personalized job application will appear here...
            </p>
            <div className={styles['previewAction']}>
              <Button
                icon={<CopyIcon />}
                iconPosition="end"
                onClick={copyEmptyApplication}
                variant="ghost"
              >
                Copy to clipboard
              </Button>
            </div>
          </div>
        )
      }
    />
  );
}
