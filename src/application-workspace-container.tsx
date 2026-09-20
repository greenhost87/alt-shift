import { useNavigate } from '@tanstack/react-router';
import { useEffect, useRef } from 'react';
import * as v from 'valibot';
import { useShallow } from 'zustand/react/shallow';
import { ApplicationWorkspace } from './components/features/application-generator/ApplicationGenerator';
import type { ApplicationFormValues } from './components/features/application-generator/ApplicationForm';
import { SectionHeader } from './components/layout/section-header/SectionHeader';
import { Shell } from './components/layout/shell/Shell';
import * as m from './paraglide/messages.js';
import { getLocale } from './paraglide/runtime.js';
import type { StoredApplication } from './system/applications/schema';
import type { NewStoredApplication } from './system/applications/storage';
import { writeClipboardText } from './system/clipboard/write';
import { GenerationError, generateApplication } from './system/generation/client';
import { safeParseGenerationRequest } from './system/generation/schema';
import type { GenerationRequest } from './system/generation/schema';
import { useApplicationStore } from './system/state/application';
import type { GenerationPhase } from './system/state/application-store';

const ACTIVE_PHASES: GenerationPhase[] = ['submitting', 'waiting-for-first-token', 'streaming'];

type GenerationStatusActions = {
  setError: (message: string) => void;
  setPhase: (phase: GenerationPhase) => void;
  setRetryAvailableAt: (value: number | undefined) => void;
  setServerApplicationLimitReached: (value: boolean) => void;
};

type FailureOptions = {
  controller: AbortController;
  currentController: AbortController | null;
  status: GenerationStatusActions;
};

type SubmissionOptions = {
  abortController: { current: AbortController | null };
  addApplication: (application: NewStoredApplication) => boolean;
  generationEndpoint: string | undefined;
  setLetter: (letter: string) => void;
  status: GenerationStatusActions;
};

const generationErrorSchema = v.instance(Error);

function handleGenerationFailure(generationError: Error, options: FailureOptions) {
  if (options.currentController !== options.controller) return;
  if (options.controller.signal.aborted) return;
  if (generationError instanceof GenerationError) {
    if (generationError.code === 'rate_limited') {
      options.status.setRetryAvailableAt(generationError.retryAfter);
    }
    if (generationError.code === 'application_limit_reached') {
      options.status.setServerApplicationLimitReached(true);
    }
  }
  options.status.setError(generationError.message);
  options.status.setPhase('failed');
}

async function submitApplication(request: GenerationRequest, options: SubmissionOptions) {
  const controller = new AbortController();
  options.abortController.current?.abort();
  options.abortController.current = controller;
  options.setLetter('');
  options.status.setError('');
  options.status.setRetryAvailableAt(undefined);
  options.status.setPhase('submitting');
  let generatedLetter = '';

  try {
    await generateApplication(request, {
      endpoint: options.generationEndpoint,
      signal: controller.signal,
      onOpen() {
        if (options.abortController.current === controller) {
          options.status.setPhase('waiting-for-first-token');
        }
      },
      onDelta(delta) {
        if (options.abortController.current !== controller) return;
        generatedLetter += delta;
        options.setLetter(generatedLetter);
        options.status.setPhase('streaming');
      },
    });

    if (options.abortController.current !== controller) return;
    if (!generatedLetter.trim()) {
      throw new GenerationError(m.generation_empty_stream(), 'empty_stream');
    }

    const saved = options.addApplication({
      company: request.company,
      details: request.details,
      letter: generatedLetter,
      role: request.jobTitle,
      strengths: request.strengths,
    });
    if (!saved) {
      options.status.setError(m.generation_storage_failed());
      options.status.setPhase('failed');
      return;
    }
    options.status.setPhase('completed');
  } catch (generationError) {
    const parsedError = v.safeParse(generationErrorSchema, generationError);
    handleGenerationFailure(
      parsedError.success ? parsedError.output : new Error(m.application_generation_failed()),
      {
        controller,
        currentController: options.abortController.current,
        status: options.status,
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
  return retryAvailableAt !== undefined;
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

type ApplicationWorkspaceContainerProps = {
  application?: StoredApplication;
  generationEndpoint?: string;
};

function resolveWorkspaceValues(
  application: StoredApplication | undefined,
  generatorValues: ApplicationFormValues,
) {
  if (application) {
    return {
      company: application.company,
      details: application.details,
      jobTitle: application.role,
      letter: application.letter,
      strengths: application.strengths,
    };
  }
  return generatorValues;
}

function isApplicationLimitReached(
  applicationCount: number,
  applicationLimit: number,
  serverApplicationLimitReached: boolean,
) {
  return applicationCount >= applicationLimit || serverApplicationLimitReached;
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

function getPreviewMode(isViewing: boolean, isCompleted: boolean, isGenerating: boolean) {
  if (isViewing) return 'viewing';
  if (isCompleted) return 'completed';
  if (isGenerating) return 'generating';
  return 'idle';
}

export function ApplicationWorkspaceContainer({
  application,
  generationEndpoint,
}: ApplicationWorkspaceContainerProps) {
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
    serverApplicationLimitReached,
    setServerApplicationLimitReached,
    subscriptionModalVisible,
    showSubscriptionModal,
    hideSubscriptionModal,
    addApplication,
    applicationCount,
    resetGenerator,
  } = useApplicationStore(
    useShallow((state) => ({
      addApplication: state.addApplication,
      applicationCount: state.applicationCount,
      company: state.company,
      config: state.config,
      copyError: state.generatorCopyError,
      details: state.details,
      error: state.generationError,
      hideSubscriptionModal: state.hideSubscriptionModal,
      jobTitle: state.jobTitle,
      letter: state.letter,
      phase: state.generationPhase,
      resetGenerator: state.resetGenerator,
      retryAvailableAt: state.retryAvailableAt,
      serverApplicationLimitReached: state.serverApplicationLimitReached,
      setCompany: state.setCompany,
      setCopyError: state.setGeneratorCopyError,
      setDetails: state.setDetails,
      setError: state.setGenerationError,
      setJobTitle: state.setJobTitle,
      setLetter: state.setLetter,
      setPhase: state.setGenerationPhase,
      setRetryAvailableAt: state.setRetryAvailableAt,
      setServerApplicationLimitReached: state.setServerApplicationLimitReached,
      setStrengths: state.setStrengths,
      showSubscriptionModal: state.showSubscriptionModal,
      strengths: state.strengths,
      subscriptionModalVisible: state.subscriptionModalVisible,
    })),
  );
  const abortController = useRef<AbortController | null>(null);
  const { applicationLimit, copyFeedbackTimeoutMs, fieldLimits } = config;
  const displayedValues = resolveWorkspaceValues(application, {
    company,
    details,
    jobTitle,
    letter,
    strengths,
  });
  const isViewing = application !== undefined;
  const parsedRequest = safeParseGenerationRequest(
    {
      company: displayedValues.company,
      details: displayedValues.details,
      jobTitle: displayedValues.jobTitle,
      locale: getLocale(),
      strengths: displayedValues.strengths,
    },
    fieldLimits,
  );
  const isGenerating = getIsGenerating(isViewing, phase);
  const applicationLimitReached = isApplicationLimitReached(
    applicationCount,
    applicationLimit,
    serverApplicationLimitReached,
  );
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
      { company, details, jobTitle, locale: getLocale(), strengths },
      {
        abortController,
        addApplication,
        generationEndpoint,
        setLetter,
        status: {
          setError,
          setPhase,
          setRetryAvailableAt,
          setServerApplicationLimitReached,
        },
      },
    );
  };

  const startNewApplication = () => {
    resetGenerator();
    if (isViewing) void navigate({ to: '/applications/new' });
  };

  const canRetry = phase === 'failed' && !applicationLimitReached;
  const isCompleted = getIsCompleted(isViewing, phase);

  return (
    <Shell>
      <ApplicationWorkspace
        applicationCount={applicationCount}
        applicationLimit={applicationLimit}
        copyError={copyError}
        copyFeedbackTimeoutMs={copyFeedbackTimeoutMs}
        error={error}
        fieldLimits={fieldLimits}
        fieldsDisabled={fieldsDisabled}
        formActions={{
          canRetry,
          isCompleted,
          isGenerating,
          newApplicationBlocked: applicationLimitReached,
          submissionBlocked,
          subscriptionRequired: applicationLimitReached,
        }}
        formHeader={<SectionHeader level="section" title={applicationTitle} />}
        formTexts={{
          additionalDetails: m.additional_details(),
          additionalDetailsPlaceholder: m.additional_details_placeholder(),
          company: m.company(),
          generateNow: m.generate_now(),
          jobTitle: m.job_title(),
          retryGeneration: m.retry_generation(),
          strengths: m.strengths(),
          subscribe: m.subscribe(),
          tryAgain: m.try_again(),
        }}
        goalDescription={m.goal_description()}
        onCloseSubscription={hideSubscriptionModal}
        onCompanyChange={setCompany}
        onCopyPreview={copyApplication}
        onDetailsChange={setDetails}
        onJobTitleChange={setJobTitle}
        onStartNew={startNewApplication}
        onStrengthsChange={setStrengths}
        onSubmit={submit}
        onSubscribe={showSubscriptionModal}
        previewGeneratingLabel={m.generating_application()}
        previewMode={getPreviewMode(isViewing, isCompleted, isGenerating)}
        previewPlaceholder={m.application_preview_placeholder()}
        retryAvailableAt={retryAvailableAt}
        retryUnavailableLabel={m.generation_retry_unavailable()}
        subscriptionModalVisible={subscriptionModalVisible}
        values={displayedValues}
      />
    </Shell>
  );
}
