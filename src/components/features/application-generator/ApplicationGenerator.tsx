import { useEffect, useRef } from 'react';
import * as v from 'valibot';
import { useShallow } from 'zustand/react/shallow';
import * as m from '../../../paraglide/messages.js';
import { getLocale } from '../../../paraglide/runtime.js';
import type { StoredApplication } from '../../../system/applications/schema';
import type { NewStoredApplication } from '../../../system/applications/storage';
import { writeClipboardText } from '../../../system/clipboard/write';
import { useApplicationStore } from '../../../system/state/application';
import type { GenerationPhase } from '../../../system/state/application-store';
import { GenerationError, generateApplication } from '../../../system/generation/client';
import { safeParseGenerationRequest } from '../../../system/generation/schema';
import type { GenerationRequest } from '../../../system/generation/schema';
import { SectionHeader } from '../../layout/section-header/SectionHeader';
import { Shell } from '../../layout/shell/Shell';
import { Workspace } from '../../layout/workspace/Workspace';
import { GoalBanner } from '../../ui/banner/Banner';
import { Button } from '../../ui/button/Button';
import { CopyButton } from '../../ui/button/CopyButton';
import { TextAreaField } from '../../ui/field/TextAreaField';
import { TextField } from '../../ui/field/TextField';
import { RepeatIcon } from '../../ui/icon/Icon';
import typographyStyles from '../../ui/text/Typography.module.css';
import styles from './ApplicationGenerator.module.css';

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
  addApplication: (application: NewStoredApplication) => boolean;
  generationEndpoint: string | undefined;
  setError: (message: string) => void;
  setLetter: (letter: string) => void;
  setPhase: (phase: GenerationPhase) => void;
  setRetryAvailableAt: (value: number | undefined) => void;
};

type FormActionsOptions = {
  canRetry: boolean;
  isCompleted: boolean;
  isGenerating: boolean;
  submissionBlocked: boolean;
};

const generationErrorSchema = v.instance(Error);

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
      endpoint: options.generationEndpoint,
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
      throw new GenerationError(m.generation_empty_stream(), 'empty_stream');
    }

    const saved = options.addApplication({
      company: request.company,
      role: request.jobTitle,
      strengths: request.strengths,
      details: request.details,
      letter: generatedLetter,
    });
    if (!saved) {
      options.setError(m.generation_storage_failed());
      options.setPhase('failed');
      return;
    }
    options.setPhase('completed');
  } catch (generationError) {
    const parsedError = v.safeParse(generationErrorSchema, generationError);
    handleGenerationFailure(
      parsedError.success ? parsedError.output : new Error(m.application_generation_failed()),
      {
        controller,
        currentController: options.abortController.current,
        setError: options.setError,
        setPhase: options.setPhase,
        setRetryAvailableAt: options.setRetryAvailableAt,
      },
    );
  } finally {
    if (options.abortController.current === controller) options.abortController.current = null;
  }
}

function renderApplicationPreview(
  letter: string,
  isCompleted: boolean,
  isGenerating: boolean,
  onCopy: () => Promise<boolean>,
) {
  const copyButton = <CopyButton onClick={onCopy} />;
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
      <output aria-label={m.generating_application()} className={styles['loadingPreview']}>
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
        {m.application_preview_placeholder()}
      </p>
      <div className={styles['previewAction']}>{copyButton}</div>
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
  applicationLimitReached: boolean,
) {
  return !requestIsValid || isGenerating || retryBlocked || applicationLimitReached;
}

function getApplicationTitle(jobTitle: string, company: string) {
  return [jobTitle, company].every((value) => value.trim().length > 0)
    ? `${jobTitle}, ${company}`
    : m.new_application();
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
    <p className={styles['rateLimit']}>{m.generation_retry_unavailable()}</p>
  ) : null;
}

function renderFormAction(options: FormActionsOptions) {
  if (options.isGenerating) {
    return (
      <Button disabled fullWidth loading size="large" type="submit">
        {m.generate_now()}
      </Button>
    );
  }
  if (options.isCompleted) {
    return (
      <Button
        disabled={options.submissionBlocked}
        fullWidth
        icon={<RepeatIcon />}
        size="large"
        type="submit"
        variant="secondary"
      >
        {m.try_again()}
      </Button>
    );
  }
  return (
    <Button disabled={options.submissionBlocked} fullWidth size="large" type="submit">
      {options.canRetry ? m.retry_generation() : m.generate_now()}
    </Button>
  );
}

type ApplicationWorkspaceProps = {
  application?: StoredApplication;
  generationEndpoint?: string;
};

type WorkspaceValues = {
  jobTitle: string;
  company: string;
  strengths: string;
  details: string;
  letter: string;
};

function resolveWorkspaceValues(
  application: StoredApplication | undefined,
  generatorValues: WorkspaceValues,
) {
  if (application) {
    return {
      jobTitle: application.role,
      company: application.company,
      strengths: application.strengths,
      details: application.details,
      letter: application.letter,
    };
  }
  return generatorValues;
}

function getFieldsDisabled(isViewing: boolean, isGenerating: boolean) {
  return isViewing || isGenerating;
}

function getIsGenerating(isViewing: boolean, phase: GenerationPhase) {
  return !isViewing && ACTIVE_PHASES.includes(phase);
}

function getIsCompleted(isViewing: boolean, phase: GenerationPhase) {
  return isViewing || phase === 'completed';
}

function renderWorkspaceFormAction(isViewing: boolean, options: FormActionsOptions) {
  return isViewing ? null : renderFormAction(options);
}

function shouldShowGoalBanner(
  isViewing: boolean,
  isCompleted: boolean,
  applicationCount: number,
  applicationLimit: number,
) {
  return !isViewing && isCompleted && applicationCount < applicationLimit;
}

export function ApplicationWorkspace({
  application,
  generationEndpoint,
}: ApplicationWorkspaceProps) {
  const {
    config,
    jobTitle,
    setJobTitle,
    company,
    setCompany,
    strengths,
    setStrengths,
    details,
    setDetails,
    phase,
    setPhase,
    letter,
    setLetter,
    error,
    setError,
    copyError,
    setCopyError,
    retryAvailableAt,
    setRetryAvailableAt,
    addApplication,
    applicationCount,
    resetGenerator,
  } = useApplicationStore(
    useShallow((state) => ({
      config: state.config,
      jobTitle: state.jobTitle,
      setJobTitle: state.setJobTitle,
      company: state.company,
      setCompany: state.setCompany,
      strengths: state.strengths,
      setStrengths: state.setStrengths,
      details: state.details,
      setDetails: state.setDetails,
      phase: state.generationPhase,
      setPhase: state.setGenerationPhase,
      letter: state.letter,
      setLetter: state.setLetter,
      error: state.generationError,
      setError: state.setGenerationError,
      copyError: state.generatorCopyError,
      setCopyError: state.setGeneratorCopyError,
      retryAvailableAt: state.retryAvailableAt,
      setRetryAvailableAt: state.setRetryAvailableAt,
      addApplication: state.addApplication,
      applicationCount: state.applications.length,
      resetGenerator: state.resetGenerator,
    })),
  );
  const abortController = useRef<AbortController | null>(null);
  const { applicationLimit, fieldLimits } = config;
  const displayedValues = resolveWorkspaceValues(application, {
    jobTitle,
    company,
    strengths,
    details,
    letter,
  });
  const isViewing = Boolean(application);
  const parsedRequest = safeParseGenerationRequest(
    {
      jobTitle: displayedValues.jobTitle,
      company: displayedValues.company,
      strengths: displayedValues.strengths,
      details: displayedValues.details,
      locale: getLocale(),
    },
    fieldLimits,
  );
  const isGenerating = getIsGenerating(isViewing, phase);
  const fieldsDisabled = getFieldsDisabled(isViewing, isGenerating);
  const retryBlocked = isRetryBlocked(retryAvailableAt);
  const hasApplicationTitle = [displayedValues.jobTitle, displayedValues.company].every(
    (value) => value.trim().length > 0,
  );
  const applicationTitle = getApplicationTitle(displayedValues.jobTitle, displayedValues.company);
  const submissionBlocked = isSubmissionBlocked(
    parsedRequest.success,
    isGenerating,
    retryBlocked,
    applicationCount >= applicationLimit,
  );

  useEffect(
    () => () => {
      abortController.current?.abort();
      resetGenerator();
    },
    [resetGenerator],
  );

  useRetryAvailability(retryAvailableAt, setRetryAvailableAt);

  const copyApplication = async () => {
    if (!displayedValues.letter) return false;
    const error = await writeClipboardText(displayedValues.letter);
    setCopyError(error);
    return !error;
  };

  const submit = () => {
    if (submissionBlocked) return;
    void submitApplication(
      { jobTitle, company, strengths, details, locale: getLocale() },
      {
        abortController,
        addApplication,
        generationEndpoint,
        setError,
        setLetter,
        setPhase,
        setRetryAvailableAt,
      },
    );
  };

  const startNewApplication = () => {
    resetGenerator();
  };

  const canRetry = phase === 'failed';
  const isCompleted = getIsCompleted(isViewing, phase);

  return (
    <Shell>
      <div className={styles['content']}>
        <Workspace
          primary={
            <div className={styles['editor']}>
              <SectionHeader
                level="section"
                muted={!hasApplicationTitle}
                title={applicationTitle}
              />
              <form
                className={styles['form']}
                onSubmit={(event) => {
                  event.preventDefault();
                  submit();
                }}
              >
                <div className={styles['fieldRow']}>
                  <TextField
                    characterLimit={fieldLimits.jobTitle}
                    disabled={fieldsDisabled}
                    id="job-title"
                    label={m.job_title()}
                    name="jobTitle"
                    onChange={setJobTitle}
                    value={displayedValues.jobTitle}
                  />
                  <TextField
                    characterLimit={fieldLimits.company}
                    disabled={fieldsDisabled}
                    id="company"
                    label={m.company()}
                    name="company"
                    onChange={setCompany}
                    value={displayedValues.company}
                  />
                </div>
                <TextField
                  characterLimit={fieldLimits.strengths}
                  disabled={fieldsDisabled}
                  id="strengths"
                  label={m.strengths()}
                  name="strengths"
                  onChange={setStrengths}
                  value={displayedValues.strengths}
                />
                <TextAreaField
                  characterLimit={fieldLimits.details}
                  disabled={fieldsDisabled}
                  id="details"
                  label={m.additional_details()}
                  name="details"
                  onChange={setDetails}
                  placeholder={m.additional_details_placeholder()}
                  value={displayedValues.details}
                />
                {renderAlert(error)}
                {renderAlert(copyError)}
                {renderRetryMessage(retryBlocked)}
                {renderWorkspaceFormAction(isViewing, {
                  canRetry,
                  isCompleted,
                  isGenerating,
                  submissionBlocked,
                })}
              </form>
            </div>
          }
          secondary={renderApplicationPreview(
            displayedValues.letter,
            isCompleted,
            isGenerating,
            copyApplication,
          )}
        />
        <GoalBanner
          current={applicationCount}
          description={m.goal_description()}
          onCreate={startNewApplication}
          total={applicationLimit}
          visible={shouldShowGoalBanner(isViewing, isCompleted, applicationCount, applicationLimit)}
        />
      </div>
    </Shell>
  );
}
