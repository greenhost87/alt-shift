import { useNavigate } from '@tanstack/react-router';
import { useCallback, useEffect, useRef, useState } from 'react';
import * as v from 'valibot';
import { useShallow } from 'zustand/react/shallow';
import { ApplicationWorkspace } from './components/features/application-generator/ApplicationGenerator';
import type { ApplicationFormValues } from './components/features/application-generator/ApplicationForm';
import { SectionHeader } from './components/layout/section-header/SectionHeader';
import { Shell } from './components/layout/shell/Shell';
import * as m from './paraglide/messages.js';
import { getLocale } from './paraglide/runtime.js';
import type { StoredApplication } from './system/applications/schema';
import type { NewStoredApplication } from './system/applications/schema';
import { writeClipboardText } from './system/clipboard/write';
import { generateApplication } from './system/generation/client';
import { GenerationError } from './system/generation/errors';
import { safeParseGenerationRequest } from './system/generation/schema';
import type { GenerationRequest } from './system/generation/schema';
import {
  useApplicationConfig,
  useFormDraftStore,
  useGenerationStore,
  usePersistenceStore,
} from './system/state/application';
import type {
  GenerationFieldLimits,
  InitialApplicationForm,
} from './system/config/application.types';
import type { FormDraftState } from './system/state/form-draft-store';
import { selectApplicationCount } from './system/state/persistence-store';
import type {
  GenerationPhase,
  GenerationState,
  GenerationStatus,
} from './system/state/generation-store';

function selectStoreState<State extends object>(state: State): State {
  return { ...state };
}

type WorkspaceValues = {
  addApplication: (application: NewStoredApplication) => boolean;
  applicationCount: number;
  applicationLimit: number;
  applicationLimitReached: boolean;
  applicationTitle: string;
  canRetry: boolean;
  company: string;
  copyFeedbackTimeoutMs: number;
  details: string;
  displayedValues: ApplicationFormValues;
  error: string;
  fieldLimits: GenerationFieldLimits;
  fieldsDisabled: boolean;
  generation: GenerationState;
  initialForm: InitialApplicationForm;
  isCompleted: boolean;
  isGenerating: boolean;
  isUntitledApplication: boolean;
  isViewing: boolean;
  jobTitle: string;
  previewMode: 'completed' | 'generating' | 'idle' | 'viewing';
  resetForm: (initialForm: InitialApplicationForm) => void;
  resetGeneration: () => void;
  retryAvailableAt: number | undefined;
  setCompany: (value: string) => void;
  setDetails: (value: string) => void;
  setJobTitle: (value: string) => void;
  setServerApplicationLimitReached: (value: boolean) => void;
  setStrengths: (value: string) => void;
  strengths: string;
  submissionBlocked: boolean;
};

const ACTIVE_PHASES: GenerationPhase[] = ['submitting', 'waiting-for-first-token', 'streaming'];

type FailureOptions = {
  controller: AbortController;
  currentController: AbortController | null;
  generation: GenerationState;
  setServerApplicationLimitReached: (value: boolean) => void;
};

type SubmissionOptions = {
  abortController: { current: AbortController | null };
  addApplication: (application: NewStoredApplication) => boolean;
  generationEndpoint: string | undefined;
  generation: GenerationState;
  setServerApplicationLimitReached: (value: boolean) => void;
};

const generationErrorSchema = v.instance(Error);

function handleGenerationFailure(generationError: Error, options: FailureOptions) {
  if (options.currentController !== options.controller) return;
  if (options.controller.signal.aborted) return;
  let retryAvailableAt: number | undefined;
  if (generationError instanceof GenerationError) {
    if (generationError.code === 'rate_limited') {
      retryAvailableAt = generationError.retryAfter;
    }
    if (generationError.code === 'application_limit_reached') {
      options.setServerApplicationLimitReached(true);
    }
  }
  options.generation.failGeneration(generationError.message, retryAvailableAt);
}

async function submitApplication(request: GenerationRequest, options: SubmissionOptions) {
  const controller = new AbortController();
  options.abortController.current?.abort();
  options.abortController.current = controller;
  options.generation.startSubmission();
  let generatedLetter = '';

  try {
    await generateApplication(request, {
      endpoint: options.generationEndpoint,
      signal: controller.signal,
      onOpen() {
        if (options.abortController.current === controller) {
          options.generation.markWaitingForFirstToken();
        }
      },
      onDelta(delta) {
        if (options.abortController.current !== controller) return;
        generatedLetter += delta;
        options.generation.setStreamingLetter(generatedLetter);
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
      options.generation.failGeneration(m.generation_storage_failed(), undefined);
      return;
    }
    options.generation.completeGeneration();
  } catch (generationError) {
    const parsedError = v.safeParse(generationErrorSchema, generationError);
    handleGenerationFailure(
      parsedError.success ? parsedError.output : new Error(m.application_generation_failed()),
      {
        controller,
        currentController: options.abortController.current,
        generation: options.generation,
        setServerApplicationLimitReached: options.setServerApplicationLimitReached,
      },
    );
  } finally {
    if (options.abortController.current === controller) options.abortController.current = null;
  }
}

function useRetryAvailability(
  retryAvailableAt: number | undefined,
  clearRetryAvailability: () => void,
) {
  useEffect(() => {
    if (!retryAvailableAt) return () => {};
    let timeout: number | undefined;
    const waitUntilRetryIsAvailable = () => {
      const remaining = retryAvailableAt - Date.now();
      if (remaining <= 0) {
        clearRetryAvailability();
        return;
      }
      timeout = window.setTimeout(waitUntilRetryIsAvailable, Math.min(remaining, 2_147_483_647));
    };
    waitUntilRetryIsAvailable();
    return () => {
      if (timeout !== undefined) window.clearTimeout(timeout);
    };
  }, [retryAvailableAt, clearRetryAvailability]);
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

type ResolvedGeneration = {
  phase: GenerationPhase;
  letter: string;
  error: string;
  retryAvailableAt: number | undefined;
};

function resolveGenerationStatus(status: GenerationStatus): ResolvedGeneration {
  if (status.phase === 'failed') {
    return {
      phase: status.phase,
      letter: status.letter,
      error: status.error,
      retryAvailableAt: status.retryAvailableAt,
    };
  }
  if (status.phase === 'streaming' || status.phase === 'completed') {
    return { phase: status.phase, letter: status.letter, error: '', retryAvailableAt: undefined };
  }
  return { phase: status.phase, letter: '', error: '', retryAvailableAt: undefined };
}

function getPreviewMode(isViewing: boolean, isCompleted: boolean, isGenerating: boolean) {
  if (isViewing) return 'viewing';
  if (isCompleted) return 'completed';
  if (isGenerating) return 'generating';
  return 'idle';
}

function useSubscriptionModal() {
  const [subscriptionModalVisible, setSubscriptionModalVisible] = useState(false);
  const showSubscriptionModal = useCallback(() => {
    setSubscriptionModalVisible(true);
  }, []);
  const hideSubscriptionModal = useCallback(() => {
    setSubscriptionModalVisible(false);
  }, []);
  return { subscriptionModalVisible, showSubscriptionModal, hideSubscriptionModal };
}

function useWorkspaceValues(application: StoredApplication | undefined): WorkspaceValues {
  const config = useApplicationConfig();
  const {
    jobTitle,
    setJobTitle,
    company,
    setCompany,
    strengths,
    setStrengths,
    details,
    setDetails,
    resetForm,
  } = useFormDraftStore(useShallow((state: FormDraftState) => selectStoreState(state)));
  const generation = useGenerationStore(
    useShallow((state: GenerationState) => selectStoreState(state)),
  );
  const { phase, letter, error, retryAvailableAt }: ResolvedGeneration = resolveGenerationStatus(
    generation.status,
  );
  const applicationCount = usePersistenceStore(selectApplicationCount);
  const { addApplication, serverApplicationLimitReached, setServerApplicationLimitReached } =
    usePersistenceStore(
      useShallow((state) => ({
        addApplication: state.addApplication,
        serverApplicationLimitReached: state.serverApplicationLimitReached,
        setServerApplicationLimitReached: state.setServerApplicationLimitReached,
      })),
    );
  const { applicationLimit, copyFeedbackTimeoutMs, fieldLimits, initialForm } = config;
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
  const isUntitledApplication =
    displayedValues.jobTitle.trim().length === 0 || displayedValues.company.trim().length === 0;
  const submissionBlocked = isSubmissionBlocked(
    parsedRequest.success,
    isGenerating,
    retryBlocked,
    applicationLimitReached,
  );
  const canRetry = phase === 'failed' && !applicationLimitReached;
  const isCompleted = getIsCompleted(isViewing, phase);
  const previewMode = getPreviewMode(isViewing, isCompleted, isGenerating);
  return {
    addApplication,
    applicationCount,
    applicationLimit,
    applicationLimitReached,
    applicationTitle,
    canRetry,
    company,
    copyFeedbackTimeoutMs,
    details,
    displayedValues,
    error,
    fieldLimits,
    fieldsDisabled,
    generation,
    initialForm,
    isCompleted,
    isGenerating,
    isUntitledApplication,
    isViewing,
    jobTitle,
    previewMode,
    resetForm,
    resetGeneration: generation.resetGeneration,
    retryAvailableAt,
    setCompany,
    setDetails,
    setJobTitle,
    setServerApplicationLimitReached,
    setStrengths,
    strengths,
    submissionBlocked,
  };
}

function useWorkspaceActions({
  generationEndpoint,
  values,
}: {
  generationEndpoint: string | undefined;
  values: WorkspaceValues;
}) {
  const navigate = useNavigate();
  const abortController = useRef<AbortController | null>(null);
  const [copyError, setCopyError] = useState('');
  const { initialForm, resetForm, resetGeneration } = values;

  useEffect(
    () => () => {
      abortController.current?.abort();
      resetGeneration();
      resetForm(initialForm);
    },
    [initialForm, resetForm, resetGeneration],
  );

  useRetryAvailability(values.retryAvailableAt, values.generation.clearRetryAvailability);

  const copyApplication = async () => {
    if (!values.displayedValues.letter) return false;
    const nextCopyError = await writeClipboardText(values.displayedValues.letter);
    setCopyError(nextCopyError);
    return !nextCopyError;
  };

  const submit = () => {
    if (values.submissionBlocked) return;
    void submitApplication(
      {
        company: values.company,
        details: values.details,
        jobTitle: values.jobTitle,
        locale: getLocale(),
        strengths: values.strengths,
      },
      {
        abortController,
        addApplication: values.addApplication,
        generationEndpoint,
        generation: values.generation,
        setServerApplicationLimitReached: values.setServerApplicationLimitReached,
      },
    );
  };

  const startNewApplication = () => {
    values.resetGeneration();
    values.resetForm(values.initialForm);
    if (values.isViewing) void navigate({ to: '/applications/new' });
  };

  return { copyApplication, copyError, startNewApplication, submit };
}

export function ApplicationWorkspaceContainer({
  application,
  generationEndpoint,
}: ApplicationWorkspaceContainerProps) {
  const values = useWorkspaceValues(application);
  const { subscriptionModalVisible, showSubscriptionModal, hideSubscriptionModal } =
    useSubscriptionModal();
  const { copyApplication, copyError, startNewApplication, submit } = useWorkspaceActions({
    generationEndpoint,
    values,
  });

  return (
    <Shell>
      <ApplicationWorkspace
        applicationCount={values.applicationCount}
        applicationLimit={values.applicationLimit}
        copyError={copyError}
        copyFeedbackTimeoutMs={values.copyFeedbackTimeoutMs}
        error={values.error}
        fieldLimits={values.fieldLimits}
        fieldsDisabled={values.fieldsDisabled}
        formActions={{
          canRetry: values.canRetry,
          isCompleted: values.isCompleted,
          isGenerating: values.isGenerating,
          newApplicationBlocked: values.applicationLimitReached,
          submissionBlocked: values.submissionBlocked,
          subscriptionRequired: values.applicationLimitReached,
        }}
        formHeader={
          <SectionHeader
            level="section"
            muted={values.isUntitledApplication && !values.isViewing}
            title={values.applicationTitle}
          />
        }
        formTexts={{
          additionalDetails: m.additional_details(),
          additionalDetailsPlaceholder: m.additional_details_placeholder(),
          company: m.company(),
          companyPlaceholder: m.company_placeholder(),
          generateNow: m.generate_now(),
          jobTitle: m.job_title(),
          jobTitlePlaceholder: m.job_title_placeholder(),
          requiredError: m.field_required(),
          retryGeneration: m.retry_generation(),
          strengths: m.strengths(),
          strengthsPlaceholder: m.strengths_placeholder(),
          subscribe: m.subscribe(),
          tryAgain: m.try_again(),
        }}
        goalDescription={m.goal_description()}
        onCloseSubscription={hideSubscriptionModal}
        onCompanyChange={values.setCompany}
        onCopyPreview={copyApplication}
        onDetailsChange={values.setDetails}
        onJobTitleChange={values.setJobTitle}
        onStartNew={startNewApplication}
        onStrengthsChange={values.setStrengths}
        onSubmit={submit}
        onSubscribe={showSubscriptionModal}
        previewGeneratingLabel={m.generating_application()}
        previewMode={values.previewMode}
        previewPlaceholder={m.application_preview_placeholder()}
        retryAvailableAt={values.retryAvailableAt}
        retryUnavailableLabel={m.generation_retry_unavailable()}
        savedLetterLabel={m.saved_letter()}
        subscriptionModalVisible={subscriptionModalVisible}
        values={values.displayedValues}
      />
    </Shell>
  );
}
