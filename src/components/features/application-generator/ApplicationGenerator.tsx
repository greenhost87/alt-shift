import { useNavigate } from '@tanstack/react-router';
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
import { Shell } from '../../layout/shell/Shell';
import workspaceStyles from '../../layout/workspace/Workspace.module.css';
import { GoalBanner } from '../../ui/banner/Banner';
import { ApplicationForm } from './ApplicationForm';
import type { ApplicationFormValues } from './ApplicationForm';
import { ApplicationPreview } from './ApplicationPreview';
import previewStyles from './ApplicationPreview.module.css';
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

type ApplicationWorkspaceProps = {
  application?: StoredApplication;
  generationEndpoint?: string;
};

function resolveWorkspaceValues(
  application: StoredApplication | undefined,
  generatorValues: ApplicationFormValues,
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

function getFieldsDisabled(
  isViewing: boolean,
  isGenerating: boolean,
  applicationLimitReached: boolean,
) {
  return isViewing || isGenerating || applicationLimitReached;
}

function getIsGenerating(isViewing: boolean, phase: GenerationPhase) {
  return !isViewing && ACTIVE_PHASES.includes(phase);
}

function getIsCompleted(isViewing: boolean, phase: GenerationPhase) {
  return isViewing || phase === 'completed';
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
  const navigate = useNavigate();
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
      applicationCount: state.applicationCount,
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
  const applicationLimitReached = applicationCount >= applicationLimit;
  const fieldsDisabled = getFieldsDisabled(isViewing, isGenerating, applicationLimitReached);
  const retryBlocked = isRetryBlocked(retryAvailableAt);
  const applicationTitle = getApplicationTitle(displayedValues.jobTitle, displayedValues.company);
  const submissionBlocked = isSubmissionBlocked(
    parsedRequest.success,
    isGenerating,
    retryBlocked,
    applicationLimitReached,
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
    if (isViewing) void navigate({ to: '/applications/new' });
  };

  const canRetry = phase === 'failed';
  const isCompleted = getIsCompleted(isViewing, phase);
  const secondaryClasses = [
    workspaceStyles['secondary'],
    isViewing ? previewStyles['storedPanel'] : '',
  ].join(' ');

  return (
    <Shell>
      <div className={styles['content']}>
        <div className={workspaceStyles['workspace']}>
          <section className={workspaceStyles['primary']}>
            <ApplicationForm
              actions={{ canRetry, isCompleted, isGenerating, submissionBlocked }}
              copyError={copyError}
              error={error}
              fieldLimits={fieldLimits}
              fieldsDisabled={fieldsDisabled}
              isViewing={isViewing}
              onCompanyChange={setCompany}
              onDetailsChange={setDetails}
              onJobTitleChange={setJobTitle}
              onStartNew={startNewApplication}
              onStrengthsChange={setStrengths}
              onSubmit={submit}
              retryMessage={retryBlocked ? m.generation_retry_unavailable() : ''}
              title={applicationTitle}
              values={displayedValues}
            />
          </section>
          <section className={secondaryClasses}>
            {isViewing ? (
              <ApplicationPreview
                letter={displayedValues.letter}
                mode="viewing"
                onCopy={copyApplication}
              />
            ) : isCompleted ? (
              <ApplicationPreview
                letter={displayedValues.letter}
                mode="completed"
                onCopy={copyApplication}
              />
            ) : isGenerating ? (
              <ApplicationPreview
                letter={displayedValues.letter}
                mode="generating"
                onCopy={copyApplication}
              />
            ) : (
              <ApplicationPreview
                letter={displayedValues.letter}
                mode="idle"
                onCopy={copyApplication}
              />
            )}
          </section>
        </div>
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
