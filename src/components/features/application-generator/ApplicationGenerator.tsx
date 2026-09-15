import { useEffect, useRef, useState } from 'react';
import { useStoredApplications } from '../../../system/applications/storage';
import { GenerationError, generateApplication } from '../../../system/generation/client';
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

type GenerationPhase =
  | 'idle'
  | 'submitting'
  | 'waiting-for-first-token'
  | 'streaming'
  | 'completed'
  | 'cancelled'
  | 'failed';

const PHASE_STATUS: Record<GenerationPhase, string> = {
  idle: '',
  submitting: 'Submitting your application…',
  'waiting-for-first-token': 'Waiting for the first response…',
  streaming: 'Writing your application…',
  completed: 'Application generated and saved.',
  cancelled: 'Generation cancelled. Your partial application is still available.',
  failed: 'Generation failed. You can retry when ready.',
};

export function ApplicationWorkspace() {
  const [jobTitle, setJobTitle] = useState(INITIAL_JOB_TITLE);
  const [company, setCompany] = useState(INITIAL_COMPANY);
  const [strengths, setStrengths] = useState(INITIAL_STRENGTHS);
  const [details, setDetails] = useState(INITIAL_DETAILS);
  const [phase, setPhase] = useState<GenerationPhase>('idle');
  const [letter, setLetter] = useState('');
  const [error, setError] = useState('');
  const [copyError, setCopyError] = useState('');
  const [retryAvailableAt, setRetryAvailableAt] = useState<number>();
  const abortController = useRef<AbortController | null>(null);
  const { addApplication } = useStoredApplications();
  const detailsLength = details.length;
  const parsedRequest = safeParseGenerationRequest({ jobTitle, company, strengths, details });
  const isGenerating =
    phase === 'submitting' || phase === 'waiting-for-first-token' || phase === 'streaming';
  const retryBlocked = retryAvailableAt !== undefined && retryAvailableAt > Date.now();
  const hasApplicationTitle = jobTitle.trim().length > 0 && company.trim().length > 0;
  const applicationTitle = hasApplicationTitle ? `${jobTitle}, ${company}` : 'New application';

  useEffect(
    () => () => {
      abortController.current?.abort();
    },
    [],
  );

  useEffect(() => {
    if (!retryAvailableAt) return;
    let timeout: number | undefined;
    const waitUntilRetryIsAvailable = () => {
      const remaining = retryAvailableAt - Date.now();
      if (remaining <= 0) {
        setRetryAvailableAt(undefined);
        return;
      }
      timeout = window.setTimeout(waitUntilRetryIsAvailable, Math.min(remaining, 2_147_483_647));
    };
    waitUntilRetryIsAvailable();
    return () => {
      if (timeout !== undefined) window.clearTimeout(timeout);
    };
  }, [retryAvailableAt]);

  const copyApplication = async () => {
    try {
      await navigator.clipboard.writeText(letter);
      setCopyError('');
    } catch {
      setCopyError('The application could not be copied to the clipboard. Please try again.');
    }
  };

  const cancel = () => {
    if (!isGenerating) return;
    const controller = abortController.current;
    abortController.current = null;
    controller?.abort();
    setError('');
    setPhase('cancelled');
  };

  const submit = async () => {
    if (!parsedRequest.success || isGenerating || retryBlocked) return;

    const request = parsedRequest.output;
    const controller = new AbortController();
    abortController.current?.abort();
    abortController.current = controller;
    setLetter('');
    setError('');
    setRetryAvailableAt(undefined);
    setPhase('submitting');
    let generatedLetter = '';

    try {
      await generateApplication(request, {
        signal: controller.signal,
        onOpen() {
          if (abortController.current === controller) setPhase('waiting-for-first-token');
        },
        onDelta(delta) {
          if (abortController.current !== controller) return;
          generatedLetter += delta;
          setLetter(generatedLetter);
          setPhase('streaming');
        },
      });

      if (abortController.current !== controller) return;
      if (!generatedLetter.trim()) {
        throw new GenerationError(
          'The generation stream ended before a letter was created.',
          'empty_stream',
        );
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
      if (abortController.current !== controller) return;
      if (controller.signal.aborted) {
        setPhase('cancelled');
        return;
      }
      if (generationError instanceof GenerationError && generationError.code === 'rate_limited') {
        setRetryAvailableAt(generationError.retryAfter);
      }
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
        <Button
          icon={<CopyIcon />}
          iconPosition="end"
          onClick={() => void copyApplication()}
          variant="ghost"
        >
          Copy to clipboard
        </Button>
      </div>
    </div>
  ) : isGenerating ? (
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
        <Button
          icon={<CopyIcon />}
          iconPosition="end"
          onClick={() => void copyApplication()}
          variant="ghost"
        >
          Copy to clipboard
        </Button>
      </div>
    </div>
  );

  const canRetry = phase === 'cancelled' || phase === 'failed';

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
            {copyError ? (
              <p className={styles['error']} role="alert">
                {copyError}
              </p>
            ) : null}
            {retryBlocked ? (
              <p className={styles['rateLimit']}>Retry is unavailable until the server limit expires.</p>
            ) : null}
            <span aria-atomic="true" aria-live="polite" className={styles['status']}>
              {PHASE_STATUS[phase]}
            </span>
            <div className={styles['formActions']}>
              {isGenerating ? (
                <>
                  <Button disabled fullWidth loading size="large" type="submit">
                    Generate Now
                  </Button>
                  <Button fullWidth onClick={cancel} size="large" variant="secondary">
                    Cancel generation
                  </Button>
                </>
              ) : canRetry ? (
                <Button
                  disabled={!parsedRequest.success || retryBlocked}
                  fullWidth
                  size="large"
                  type="submit"
                >
                  Retry generation
                </Button>
              ) : (
                <Button disabled={!parsedRequest.success} fullWidth size="large" type="submit">
                  Generate Now
                </Button>
              )}
            </div>
          </form>
        </div>
      }
      secondary={preview}
    />
  );
}
