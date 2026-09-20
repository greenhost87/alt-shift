import type { ReactNode } from 'react';
import { GoalBanner, SubscriptionModal } from '../../ui/banner/Banner';
import { ApplicationForm } from './ApplicationForm';
import type {
  ApplicationFieldLimits,
  ApplicationFormActions,
  ApplicationFormTexts,
  ApplicationFormValues,
} from './ApplicationForm';
import { ApplicationPreview } from './ApplicationPreview';
import type { ApplicationPreviewMode } from './ApplicationPreview';
import previewStyles from './ApplicationPreview.module.css';
import styles from './ApplicationGenerator.module.css';

type ApplicationWorkspaceProps = {
  applicationCount: number;
  applicationLimit: number;
  copyError: string;
  copyFeedbackTimeoutMs: number;
  error: string;
  fieldLimits: ApplicationFieldLimits;
  fieldsDisabled: boolean;
  formActions: ApplicationFormActions;
  formHeader: ReactNode;
  formTexts: ApplicationFormTexts;
  goalDescription: string;
  onCloseSubscription: () => void;
  onCompanyChange: (value: string) => void;
  onCopyPreview: () => Promise<boolean>;
  onDetailsChange: (value: string) => void;
  onJobTitleChange: (value: string) => void;
  onStartNew: () => void;
  onStrengthsChange: (value: string) => void;
  onSubmit: () => void;
  onSubscribe: () => void;
  previewGeneratingLabel: string;
  previewMode: ApplicationPreviewMode;
  previewPlaceholder: string;
  retryAvailableAt: number | undefined;
  retryUnavailableLabel: string;
  subscriptionModalVisible: boolean;
  values: ApplicationFormValues;
};

function shouldShowGoalBanner(
  isViewing: boolean,
  isCompleted: boolean,
  applicationCount: number,
  applicationLimit: number,
) {
  return !isViewing && isCompleted && applicationCount < applicationLimit;
}

function getRetryMessage(retryAvailableAt: number | undefined, retryUnavailableLabel: string) {
  if (retryAvailableAt === undefined) return '';
  return retryUnavailableLabel;
}

function getSecondaryClassName(isViewing: boolean) {
  const classes = [styles['secondary'], isViewing ? previewStyles['storedPanel'] : ''];
  return classes.join(' ').trim();
}

function renderFormPanel(
  props: ApplicationWorkspaceProps,
  isViewing: boolean,
  retryMessage: string,
) {
  return (
    <section className={styles['primary']}>
      <ApplicationForm
        actions={props.formActions}
        copyError={props.copyError}
        error={props.error}
        fieldLimits={props.fieldLimits}
        fieldsDisabled={props.fieldsDisabled}
        header={props.formHeader}
        isViewing={isViewing}
        onCompanyChange={props.onCompanyChange}
        onDetailsChange={props.onDetailsChange}
        onJobTitleChange={props.onJobTitleChange}
        onStartNew={props.onStartNew}
        onSubscribe={props.onSubscribe}
        onStrengthsChange={props.onStrengthsChange}
        onSubmit={props.onSubmit}
        retryMessage={retryMessage}
        texts={props.formTexts}
        values={props.values}
      />
    </section>
  );
}

function renderPreviewPanel(props: ApplicationWorkspaceProps, secondaryClasses: string) {
  return (
    <section className={secondaryClasses}>
      <ApplicationPreview
        copyFeedbackTimeoutMs={props.copyFeedbackTimeoutMs}
        generatingLabel={props.previewGeneratingLabel}
        letter={props.values.letter}
        mode={props.previewMode}
        onCopy={props.onCopyPreview}
        placeholder={props.previewPlaceholder}
      />
    </section>
  );
}

function renderWorkspaceFooter(props: ApplicationWorkspaceProps, isViewing: boolean) {
  return (
    <>
      <GoalBanner
        current={props.applicationCount}
        description={props.goalDescription}
        onCreate={props.onStartNew}
        total={props.applicationLimit}
        visible={shouldShowGoalBanner(
          isViewing,
          props.formActions.isCompleted,
          props.applicationCount,
          props.applicationLimit,
        )}
      />
      <SubscriptionModal
        visible={props.subscriptionModalVisible}
        onClose={props.onCloseSubscription}
      />
    </>
  );
}

export function ApplicationWorkspace(props: ApplicationWorkspaceProps) {
  const isViewing = props.previewMode === 'viewing';
  const retryMessage = getRetryMessage(props.retryAvailableAt, props.retryUnavailableLabel);
  const secondaryClasses = getSecondaryClassName(isViewing);

  return (
    <div className={styles['content']}>
      <div className={styles['workspace']}>
        {renderFormPanel(props, isViewing, retryMessage)}
        {renderPreviewPanel(props, secondaryClasses)}
      </div>
      {renderWorkspaceFooter(props, isViewing)}
    </div>
  );
}
