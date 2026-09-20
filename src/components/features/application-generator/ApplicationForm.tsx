import type { ReactNode } from 'react';
import { Button } from '../../ui/button/Button';
import { TextAreaField } from '../../ui/field/TextAreaField';
import { TextField } from '../../ui/field/TextField';
import { RepeatIcon } from '../../ui/icon/Icon';
import styles from './ApplicationForm.module.css';

export type ApplicationFormValues = {
  jobTitle: string;
  company: string;
  strengths: string;
  details: string;
  letter: string;
};

export type ApplicationFieldLimits = {
  jobTitle: number;
  company: number;
  strengths: number;
  details: number;
};

export type ApplicationFormTexts = {
  jobTitle: string;
  company: string;
  strengths: string;
  additionalDetails: string;
  additionalDetailsPlaceholder: string;
  subscribe: string;
  generateNow: string;
  tryAgain: string;
  retryGeneration: string;
};

export type ApplicationFormActions = {
  canRetry: boolean;
  isCompleted: boolean;
  isGenerating: boolean;
  newApplicationBlocked: boolean;
  submissionBlocked: boolean;
  subscriptionRequired: boolean;
};

type ApplicationFormProps = {
  actions: ApplicationFormActions;
  copyError: string;
  error: string;
  fieldLimits: ApplicationFieldLimits;
  fieldsDisabled: boolean;
  header: ReactNode;
  isViewing: boolean;
  onCompanyChange: (value: string) => void;
  onDetailsChange: (value: string) => void;
  onJobTitleChange: (value: string) => void;
  onStartNew: () => void;
  onSubscribe: () => void;
  onStrengthsChange: (value: string) => void;
  onSubmit: () => void;
  retryMessage: string;
  texts: ApplicationFormTexts;
  values: ApplicationFormValues;
};

type FormActionTexts = {
  subscribe: string;
  generateNow: string;
  tryAgain: string;
  retryGeneration: string;
};

function renderAlert(message: string) {
  return message ? (
    <p className={styles['error']} role="alert">
      {message}
    </p>
  ) : null;
}

function renderFormAction(
  actions: ApplicationFormActions,
  onSubscribe: () => void,
  texts: FormActionTexts,
) {
  if (actions.subscriptionRequired) {
    return (
      <Button onClick={onSubscribe} size="large">
        {texts.subscribe}
      </Button>
    );
  }
  if (actions.isGenerating) {
    return (
      <Button disabled loading size="large" submit>
        {texts.generateNow}
      </Button>
    );
  }
  if (actions.isCompleted) {
    return (
      <Button
        disabled={actions.submissionBlocked}
        icon={<RepeatIcon />}
        size="large"
        submit
        variant="secondary"
      >
        {texts.tryAgain}
      </Button>
    );
  }
  return (
    <Button disabled={actions.submissionBlocked} size="large" submit>
      {actions.canRetry ? texts.retryGeneration : texts.generateNow}
    </Button>
  );
}

type FormModeOptions = {
  canRetry: boolean;
  isCompleted: boolean;
  isGenerating: boolean;
  isViewing: boolean;
  newApplicationBlocked: boolean;
  onStartNew: () => void;
  onSubscribe: () => void;
  submissionBlocked: boolean;
  subscriptionRequired: boolean;
  texts: FormActionTexts;
};

function renderFormActionForMode(options: FormModeOptions) {
  if (!options.isViewing) return renderFormAction(options, options.onSubscribe, options.texts);
  if (options.subscriptionRequired)
    return renderFormAction(options, options.onSubscribe, options.texts);

  return (
    <Button
      disabled={options.newApplicationBlocked}
      icon={<RepeatIcon />}
      onClick={options.onStartNew}
      size="large"
      variant="secondary"
    >
      {options.texts.tryAgain}
    </Button>
  );
}

export function ApplicationForm({
  actions: {
    canRetry,
    isCompleted,
    isGenerating,
    newApplicationBlocked,
    submissionBlocked,
    subscriptionRequired,
  },
  copyError,
  error,
  fieldLimits,
  fieldsDisabled,
  header,
  isViewing,
  onCompanyChange,
  onDetailsChange,
  onJobTitleChange,
  onStartNew,
  onSubscribe,
  onStrengthsChange,
  onSubmit,
  retryMessage,
  texts,
  values,
}: ApplicationFormProps) {
  const actionTexts: FormActionTexts = {
    subscribe: texts.subscribe,
    generateNow: texts.generateNow,
    tryAgain: texts.tryAgain,
    retryGeneration: texts.retryGeneration,
  };
  return (
    <div className={styles['editor']}>
      {header}
      <form
        className={styles['form']}
        onSubmit={(event) => {
          event.preventDefault();
          onSubmit();
        }}
      >
        <div className={styles['fieldRow']}>
          <TextField
            characterLimit={fieldLimits.jobTitle}
            disabled={fieldsDisabled}
            id="job-title"
            label={texts.jobTitle}
            name="jobTitle"
            onChange={onJobTitleChange}
            value={values.jobTitle}
          />
          <TextField
            characterLimit={fieldLimits.company}
            disabled={fieldsDisabled}
            id="company"
            label={texts.company}
            name="company"
            onChange={onCompanyChange}
            value={values.company}
          />
        </div>
        <TextField
          characterLimit={fieldLimits.strengths}
          disabled={fieldsDisabled}
          id="strengths"
          label={texts.strengths}
          name="strengths"
          onChange={onStrengthsChange}
          value={values.strengths}
        />
        <TextAreaField
          characterLimit={fieldLimits.details}
          disabled={fieldsDisabled}
          id="details"
          label={texts.additionalDetails}
          name="details"
          onChange={onDetailsChange}
          placeholder={texts.additionalDetailsPlaceholder}
          value={values.details}
        />
        {renderAlert(error)}
        {renderAlert(copyError)}
        {retryMessage ? <p className={styles['rateLimit']}>{retryMessage}</p> : null}
        <div className={styles['action']}>
          {renderFormActionForMode({
            canRetry,
            isCompleted,
            isGenerating,
            isViewing,
            newApplicationBlocked,
            onStartNew,
            onSubscribe,
            submissionBlocked,
            subscriptionRequired,
            texts: actionTexts,
          })}
        </div>
      </form>
    </div>
  );
}
