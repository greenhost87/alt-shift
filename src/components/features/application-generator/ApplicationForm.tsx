import * as m from '../../../paraglide/messages.js';
import type { GenerationFieldLimits } from '../../../system/config/application.types';
import { SectionHeader } from '../../layout/section-header/SectionHeader';
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

type FormActions = {
  canRetry: boolean;
  isCompleted: boolean;
  isGenerating: boolean;
  newApplicationBlocked: boolean;
  submissionBlocked: boolean;
};

type ApplicationFormProps = {
  actions: FormActions;
  copyError: string;
  error: string;
  fieldLimits: GenerationFieldLimits;
  fieldsDisabled: boolean;
  isViewing: boolean;
  onCompanyChange: (value: string) => void;
  onDetailsChange: (value: string) => void;
  onJobTitleChange: (value: string) => void;
  onStartNew: () => void;
  onStrengthsChange: (value: string) => void;
  onSubmit: () => void;
  retryMessage: string;
  title: string;
  values: ApplicationFormValues;
};

function renderAlert(message: string) {
  return message ? (
    <p className={styles['error']} role="alert">
      {message}
    </p>
  ) : null;
}

function renderFormAction(actions: FormActions) {
  if (actions.isGenerating) {
    return (
      <Button disabled loading size="large" submit>
        {m.generate_now()}
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
        {m.try_again()}
      </Button>
    );
  }
  return (
    <Button disabled={actions.submissionBlocked} size="large" submit>
      {actions.canRetry ? m.retry_generation() : m.generate_now()}
    </Button>
  );
}

function renderFormActionForMode(isViewing: boolean, actions: FormActions, onStartNew: () => void) {
  if (!isViewing) return renderFormAction(actions);

  return (
    <Button
      disabled={actions.newApplicationBlocked}
      icon={<RepeatIcon />}
      onClick={onStartNew}
      size="large"
      variant="secondary"
    >
      {m.try_again()}
    </Button>
  );
}

export function ApplicationForm({
  actions,
  copyError,
  error,
  fieldLimits,
  fieldsDisabled,
  isViewing,
  onCompanyChange,
  onDetailsChange,
  onJobTitleChange,
  onStartNew,
  onStrengthsChange,
  onSubmit,
  retryMessage,
  title,
  values,
}: ApplicationFormProps) {
  return (
    <div className={styles['editor']}>
      <SectionHeader level="section" title={title} />
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
            label={m.job_title()}
            name="jobTitle"
            onChange={onJobTitleChange}
            value={values.jobTitle}
          />
          <TextField
            characterLimit={fieldLimits.company}
            disabled={fieldsDisabled}
            id="company"
            label={m.company()}
            name="company"
            onChange={onCompanyChange}
            value={values.company}
          />
        </div>
        <TextField
          characterLimit={fieldLimits.strengths}
          disabled={fieldsDisabled}
          id="strengths"
          label={m.strengths()}
          name="strengths"
          onChange={onStrengthsChange}
          value={values.strengths}
        />
        <TextAreaField
          characterLimit={fieldLimits.details}
          disabled={fieldsDisabled}
          id="details"
          label={m.additional_details()}
          name="details"
          onChange={onDetailsChange}
          placeholder={m.additional_details_placeholder()}
          value={values.details}
        />
        {renderAlert(error)}
        {renderAlert(copyError)}
        {retryMessage ? <p className={styles['rateLimit']}>{retryMessage}</p> : null}
        <div className={styles['action']}>
          {renderFormActionForMode(isViewing, actions, onStartNew)}
        </div>
      </form>
    </div>
  );
}
