import { useEffect, useRef, useState } from 'react';
import * as v from 'valibot';
import { useStoredApplications } from '../../../system/applications/storage';
import { writeClipboardText } from '../../../system/clipboard/write';
import { useApplicationConfig } from '../../../system/config/application';
import { GenerationError, generateApplication } from '../../../system/generation/client';
import { safeParseGenerationRequest } from '../../../system/generation/schema';
import type { GenerationRequest } from '../../../system/generation/schema';
import { SectionHeader } from '../../layout/section-header/SectionHeader';
import { Workspace } from '../../layout/workspace/Workspace';
import { GoalBanner } from '../../ui/banner/Banner';
import { Button } from '../../ui/button/Button';
import { CopyButton } from '../../ui/button/CopyButton';
import { TextAreaField } from '../../ui/field/TextAreaField';
import { TextField } from '../../ui/field/TextField';
import typographyStyles from '../../ui/text/Typography.module.css';
import styles from './ApplicationGenerator.module.css';

type GenerationPhase =
  | 'idle'
  | 'submitting'
  | 'waiting-for-first-token'
  | 'streaming'
  | 'completed'
  | 'failed';

const ACTIVE_PHASES: GenerationPhase[] = ['submitting', 'waiting-for-first-token', 'streaming'];

type FailureOptions = {
  controller: AbortController;
  currentController: AbortController | null;
  setError: (message: string) => void;
  setPhase: (phase: GenerationPhase) => void;
  setRetryAvailableAt: (value: number | undefined) => void;
};

type SubmissionOptions = {
  abortController: { current: AbortController | null };
  addApplication: (application: NewApplication) => boolean;
  setError: (message: string) => void;
  setLetter: (letter: string) => void;
  setPhase: (phase: GenerationPhase) => void;
  setRetryAvailableAt: (value: number | undefined) => void;
};

type NewApplication = {
  company: string;
  role: string;
  letter: string;
};

type FormActionsOptions = {
  canRetry: boolean;
  isCompleted: boolean;
  isGenerating: boolean;
  submissionBlocked: boolean;
};

const generationErrorSchema = v.fallback(
  v.instance(Error),
  new Error('The application could not be generated. Please try again.'),
);

function handleGenerationFailure(generationError: Error, options: FailureOptions) {
  if (options.currentController !== options.controller) return;
  if (options.controller.signal.aborted) return;
  if (generationError instanceof GenerationError && generationError.code === 'rate_limited') {
    options.setRetryAvailableAt(generationError.retryAfter);
  }
  options.setError(generationError.message);
  options.setPhase('failed');
}

async function submitApplication(request: GenerationRequest, options: SubmissionOptions) {
  const controller = new AbortController();
  options.abortController.current?.abort();
  options.abortController.current = controller;
  options.setLetter('');
  options.setError('');
  options.setRetryAvailableAt(undefined);
  options.setPhase('submitting');
  let generatedLetter = '';

  try {
    await generateApplication(request, {
      signal: controller.signal,
      onOpen() {
        if (options.abortController.current === controller) {
          options.setPhase('waiting-for-first-token');
        }
      },
      onDelta(delta) {
        if (options.abortController.current !== controller) return;
        generatedLetter += delta;
        options.setLetter(generatedLetter);
        options.setPhase('streaming');
      },
    });

    if (options.abortController.current !== controller) return;
    if (!generatedLetter.trim()) {
      throw new GenerationError(
        'The generation stream ended before a letter was created.',
        'empty_stream',
      );
    }

    const saved = options.addApplication({
      company: request.company,
      role: request.jobTitle,
      letter: generatedLetter,
    });
    if (!saved) {
      options.setError('Your letter was generated, but browser storage could not save it.');
      options.setPhase('failed');
      return;
    }
    options.setPhase('completed');
  } catch (generationError) {
    handleGenerationFailure(v.parse(generationErrorSchema, generationError), {
      controller,
      currentController: options.abortController.current,
      setError: options.setError,
      setPhase: options.setPhase,
      setRetryAvailableAt: options.setRetryAvailableAt,
    });
  } finally {
    if (options.abortController.current === controller) options.abortController.current = null;
  }
}

function renderApplicationPreview(
  letter: string,
  isCompleted: boolean,
  isGenerating: boolean,
  onCopy: () => Promise<void>,
) {
  const copyButton = <CopyButton onClick={() => void onCopy()} />;
  if (letter) {
    return (
      <div className={[styles['preview'], isCompleted ? styles['completedPreview'] : ''].join(' ')}>
        <p className={[styles['letter'], typographyStyles['body']].join(' ')}>{letter}</p>
        <div className={styles['previewAction']}>{copyButton}</div>
      </div>
    );
  }
  if (isGenerating) {
    return (
      <output aria-label="Generating application" className={styles['loadingPreview']}>
        <span className={styles['orb']}>
          <span className={styles['orbGlow']} />
          <span className={styles['orbCore']} />
        </span>
      </output>
    );
  }
  return (
    <div className={styles['preview']}>
      <p className={[styles['placeholder'], typographyStyles['body']].join(' ')}>
        Your personalized job application will appear here...
      </p>
    </div>
  );
}

function useRetryAvailability(
  retryAvailableAt: number | undefined,
  setRetryAvailableAt: (value: number | undefined) => void,
) {
  useEffect(() => {
    if (!retryAvailableAt) return () => {};
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
  }, [retryAvailableAt, setRetryAvailableAt]);
}

function isRetryBlocked(retryAvailableAt: number | undefined) {
  return retryAvailableAt !== undefined && retryAvailableAt > Date.now();
}

function isSubmissionBlocked(
  requestIsValid: boolean,
  isGenerating: boolean,
  retryBlocked: boolean,
) {
  return !requestIsValid || isGenerating || retryBlocked;
}

function getApplicationTitle(jobTitle: string, company: string) {
  return [jobTitle, company].every((value) => value.trim().length > 0)
    ? `${jobTitle}, ${company}`
    : 'New application';
}

function renderAlert(message: string) {
  return message ? (
    <p className={styles['error']} role="alert">
      {message}
    </p>
  ) : null;
}

function renderRetryMessage(retryBlocked: boolean) {
  return retryBlocked ? (
    <p className={styles['rateLimit']}>Retry is unavailable until the server limit expires.</p>
  ) : null;
}

function renderFormAction(options: FormActionsOptions) {
  if (options.isGenerating) {
    return (
      <Button disabled fullWidth loading size="large" type="submit">
        Generate Now
      </Button>
    );
  }
  if (options.isCompleted) {
    return (
      <Button fullWidth size="large" type="submit" variant="secondary">
        Try Again
      </Button>
    );
  }
  return (
    <Button disabled={options.submissionBlocked} fullWidth size="large" type="submit">
      {options.canRetry ? 'Retry generation' : 'Generate Now'}
    </Button>
  );
}

export function ApplicationWorkspace() {
  const { applicationLimit, fieldLimits, initialForm } = useApplicationConfig();
  const [jobTitle, setJobTitle] = useState(initialForm.jobTitle);
  const [company, setCompany] = useState(initialForm.company);
  const [strengths, setStrengths] = useState(initialForm.strengths);
  const [details, setDetails] = useState(initialForm.details);
  const [phase, setPhase] = useState<GenerationPhase>('idle');
  const [letter, setLetter] = useState('');
  const [error, setError] = useState('');
  const [copyError, setCopyError] = useState('');
  const [retryAvailableAt, setRetryAvailableAt] = useState<number>();
  const abortController = useRef<AbortController | null>(null);
  const { addApplication, applications } = useStoredApplications();
  const detailsLength = details.length;
  const parsedRequest = safeParseGenerationRequest(
    { jobTitle, company, strengths, details },
    fieldLimits,
  );
  const isGenerating = ACTIVE_PHASES.includes(phase);
  const retryBlocked = isRetryBlocked(retryAvailableAt);
  const hasApplicationTitle = [jobTitle, company].every((value) => value.trim().length > 0);
  const applicationTitle = getApplicationTitle(jobTitle, company);
  const submissionBlocked = isSubmissionBlocked(parsedRequest.success, isGenerating, retryBlocked);

  useEffect(
    () => () => {
      abortController.current?.abort();
    },
    [],
  );

  useRetryAvailability(retryAvailableAt, setRetryAvailableAt);

  const copyApplication = async () => {
    setCopyError(await writeClipboardText(letter));
  };

  const submit = () => {
    if (submissionBlocked) return;
    void submitApplication(
      { jobTitle, company, strengths, details },
      {
        abortController,
        addApplication,
        setError,
        setLetter,
        setPhase,
        setRetryAvailableAt,
      },
    );
  };

  const startNewApplication = () => {
    setJobTitle(initialForm.jobTitle);
    setCompany(initialForm.company);
    setStrengths(initialForm.strengths);
    setDetails(initialForm.details);
    setLetter('');
    setError('');
    setCopyError('');
    setRetryAvailableAt(undefined);
    setPhase('idle');
  };

  const canRetry = phase === 'failed';
  const isCompleted = phase === 'completed';
  const applicationCount = applications.length;

  return (
    <div className={styles['content']}>
      <Workspace
        primary={
          <div className={styles['editor']}>
            <SectionHeader level="section" muted={!hasApplicationTitle} title={applicationTitle} />
            <form
              className={styles['form']}
              onSubmit={(event) => {
                event.preventDefault();
                submit();
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
                characterLimit={fieldLimits.details}
                disabled={isGenerating}
                hint={`${detailsLength}/${fieldLimits.details}`}
                id="details"
                label="Additional details"
                name="details"
                onChange={setDetails}
                placeholder="Describe why you are a great fit or paste your bio"
                value={details}
              />
              {renderAlert(error)}
              {renderAlert(copyError)}
              {renderRetryMessage(retryBlocked)}
              {renderFormAction({ canRetry, isCompleted, isGenerating, submissionBlocked })}
            </form>
          </div>
        }
        secondary={renderApplicationPreview(letter, isCompleted, isGenerating, copyApplication)}
      />
      <GoalBanner
        current={applicationCount}
        description="Generate and send out couple more job applications to get hired faster"
        onCreate={startNewApplication}
        total={applicationLimit}
        visible={isCompleted && applicationCount < applicationLimit}
      />
    </div>
  );
}
