import styles from './Progress.module.css';

const PROGRESS_VARIANTS = ['dots', 'segments'] as const;

export type ProgressVariant = (typeof PROGRESS_VARIANTS)[number];

type ProgressProps = {
  accessibleLabel: string;
  current: number;
  total: number;
  variant?: ProgressVariant;
};

export function Progress({ accessibleLabel, current, total, variant = 'segments' }: ProgressProps) {
  const safeTotal = Math.max(1, Math.floor(total));
  const safeCurrent = Math.min(Math.max(0, Math.floor(current)), safeTotal);
  const isDots = variant === 'dots';

  return (
    <div
      aria-label={accessibleLabel}
      aria-valuemax={safeTotal}
      aria-valuemin={0}
      aria-valuenow={safeCurrent}
      className={isDots ? styles['dots'] : styles['progress']}
      role="progressbar"
    >
      <div aria-hidden="true" className={styles['segments']}>
        {Array.from({ length: safeTotal }, (_, index) => (
          <span
            className={index < safeCurrent ? styles['complete'] : styles['incomplete']}
            key={index}
          />
        ))}
      </div>
      {isDots ? null : (
        <span className={styles['label']}>
          {safeCurrent} out of {safeTotal}
        </span>
      )}
    </div>
  );
}
