import * as m from '../../../paraglide/messages.js';
import { CopyButton } from '../../ui/button/CopyButton';
import typographyStyles from '../../ui/text/Typography.module.css';
import styles from './ApplicationPreview.module.css';

type PreviewMode = 'idle' | 'generating' | 'completed' | 'viewing';

type ApplicationPreviewProps = {
  copyFeedbackTimeoutMs: number;
  letter: string;
  mode: PreviewMode;
  onCopy: () => Promise<boolean>;
};

export function ApplicationPreview({
  copyFeedbackTimeoutMs,
  letter,
  mode,
  onCopy,
}: ApplicationPreviewProps) {
  const copyButton = <CopyButton feedbackTimeoutMs={copyFeedbackTimeoutMs} onClick={onCopy} />;
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
