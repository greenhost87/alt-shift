import { CopyButton } from '../../ui/button/CopyButton';
import typographyStyles from '../../ui/text/Typography.module.css';
import styles from './ApplicationPreview.module.css';

const APPLICATION_PREVIEW_MODES = ['idle', 'generating', 'completed', 'viewing'] as const;
export type ApplicationPreviewMode = (typeof APPLICATION_PREVIEW_MODES)[number];

type ApplicationPreviewProps = {
  copyFeedbackTimeoutMs: number;
  generatingLabel: string;
  letter: string;
  mode: ApplicationPreviewMode;
  onCopy: () => Promise<boolean>;
  placeholder: string;
};

export function ApplicationPreview({
  copyFeedbackTimeoutMs,
  generatingLabel,
  letter,
  mode,
  onCopy,
  placeholder,
}: ApplicationPreviewProps) {
  const copyButton = (
    <CopyButton feedbackTimeoutMs={copyFeedbackTimeoutMs} key={letter} onClick={onCopy} />
  );
  if (letter) {
    return (
      <div
        className={[
          styles['preview'],
          mode === 'completed' || mode === 'viewing' ? styles['completedPreview'] : '',
        ].join(' ')}
      >
        {mode === 'viewing' ? (
          <div className={styles['mobilePreviewAction']}>{copyButton}</div>
        ) : null}
        <p className={[styles['letter'], typographyStyles['body']].join(' ')}>
          {letter}
          {mode === 'generating' ? (
            <span
              aria-hidden="true"
              className={styles['generationCaret']}
              data-testid="generation-caret"
            />
          ) : null}
        </p>
        <div className={styles['previewAction']}>{copyButton}</div>
      </div>
    );
  }
  if (mode === 'generating') {
    return (
      <output aria-label={generatingLabel} className={styles['loadingPreview']}>
        <span className={styles['orb']}>
          <span className={styles['orbGlow']} />
          <span className={styles['orbCore']} />
        </span>
      </output>
    );
  }
  return (
    <div className={styles['preview']}>
      <p className={[styles['placeholder'], typographyStyles['body']].join(' ')}>{placeholder}</p>
      <div className={styles['previewAction']}>{copyButton}</div>
    </div>
  );
}
