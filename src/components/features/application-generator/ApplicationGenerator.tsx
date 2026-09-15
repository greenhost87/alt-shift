import { useEffect, useRef, useState } from 'react';
import { useStoredApplications } from '../../../system/applications/storage';
import { generateApplication } from '../../../system/generation/client';
import { safeParseGenerationRequest } from '../../../system/generation/schema';
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

type GenerationPhase = 'idle' | 'waiting' | 'streaming' | 'completed' | 'failed';

export function ApplicationWorkspace() {
  const [jobTitle, setJobTitle] = useState(INITIAL_JOB_TITLE);
  const [company, setCompany] = useState(INITIAL_COMPANY);
  const [strengths, setStrengths] = useState(INITIAL_STRENGTHS);
  const [details, setDetails] = useState(INITIAL_DETAILS);
  const [phase, setPhase] = useState<GenerationPhase>('idle');
  const [letter, setLetter] = useState('');
  const [error, setError] = useState('');
  const abortController = useRef<AbortController | null>(null);
  const { addApplication } = useStoredApplications();
  const detailsLength = details.length;
  const parsedRequest = safeParseGenerationRequest({ jobTitle, company, strengths, details });
  const isGenerating = phase === 'waiting' || phase === 'streaming';
  const hasApplicationTitle = jobTitle.trim().length > 0 && company.trim().length > 0;
  const applicationTitle = hasApplicationTitle ? `${jobTitle}, ${company}` : 'New application';

  useEffect(
    () => () => {
      abortController.current?.abort();
    },
    [],
  );

  const copyApplication = () => {
    void navigator.clipboard.writeText(letter);
  };

  const submit = async () => {
    if (!parsedRequest.success || isGenerating) return;

    const request = parsedRequest.output;
    const controller = new AbortController();
    abortController.current?.abort();
    abortController.current = controller;
    setLetter('');
    setError('');
    setPhase('waiting');
    let generatedLetter = '';

    try {
      await generateApplication(request, {
        signal: controller.signal,
        onDelta(delta) {
          generatedLetter += delta;
          setLetter(generatedLetter);
          setPhase('streaming');
        },
      });

      if (!generatedLetter.trim()) {
        throw new Error('The generation stream ended before a letter was created.');
      }

      const saved = addApplication({
        company: request.company,
        role: request.jobTitle,
        letter: generatedLetter,
      });
      if (!saved) {
        setError('Your letter was generated, but browser storage could not save it.');
        setPhase('failed');
        return;
      }
      setPhase('completed');
    } catch (generationError) {
      if (controller.signal.aborted) return;
      setError(
        generationError instanceof Error
          ? generationError.message
          : 'The application could not be generated. Please try again.',
      );
      setPhase('failed');
    } finally {
      if (abortController.current === controller) abortController.current = null;
    }
  };

  const preview = letter ? (
    <div className={styles['preview']}>
      <p className={[styles['letter'], typographyStyles['body']].join(' ')}>{letter}</p>
      <div className={styles['previewAction']}>
        <Button icon={<CopyIcon />} iconPosition="end" onClick={copyApplication} variant="ghost">
          Copy to clipboard
        </Button>
      </div>
    </div>
  ) : phase === 'waiting' ? (
    <div aria-label="Generating application" className={styles['loadingPreview']} role="status">
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
        <Button icon={<CopyIcon />} iconPosition="end" onClick={copyApplication} variant="ghost">
          Copy to clipboard
        </Button>
      </div>
    </div>
  );

  return (
    <Workspace
      primary={
        <div className={styles['editor']}>
          <SectionHeader level="section" muted={!hasApplicationTitle} title={applicationTitle} />
          <form
            className={styles['form']}
            onSubmit={(event) => {
              event.preventDefault();
              void submit();
            }}
          >
            <div className={styles['fieldRow']}>
              <TextField
                disabled={isGenerating}
                id="job-title"
                label="Job title"
                name="jobTitle"
                onChange={setJobTitle}
                value={jobTitle}
              />
              <TextField
                disabled={isGenerating}
                id="company"
                label="Company"
                name="company"
                onChange={setCompany}
                value={company}
              />
            </div>
            <TextField
              disabled={isGenerating}
              id="strengths"
              label="I am good at..."
              name="strengths"
              onChange={setStrengths}
              value={strengths}
            />
            <TextAreaField
              autoFocus
              characterLimit={DETAILS_LIMIT}
              disabled={isGenerating}
              hint={`${detailsLength}/${DETAILS_LIMIT}`}
              id="details"
              label="Additional details"
              name="details"
              onChange={setDetails}
              placeholder="Describe why you are a great fit or paste your bio"
              value={details}
            />
            {error ? (
              <p className={styles['error']} role="alert">
                {error}
              </p>
            ) : null}
            <span aria-live="polite" className={styles['status']}>
              {phase === 'streaming' ? 'Writing your application…' : null}
              {phase === 'completed' ? 'Application generated and saved.' : null}
            </span>
            <Button
              disabled={!parsedRequest.success}
              fullWidth
              loading={isGenerating || undefined}
              size="large"
              type="submit"
            >
              Generate Now
            </Button>
          </form>
        </div>
      }
      secondary={preview}
    />
  );
}
