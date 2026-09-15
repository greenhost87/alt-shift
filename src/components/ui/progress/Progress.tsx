import styles from './Progress.module.css';

const PROGRESS_VARIANTS = ['dots', 'segments'] as const;

type ProgressVariant = (typeof PROGRESS_VARIANTS)[number];

type ProgressProps = {
  accessibleLabel: string;
  current: number;
  total: number;
  variant?: ProgressVariant;
};

export function getProgressValues(current: number, total: number) {
  const safeTotal = Math.max(1, Math.floor(total));
  const safeCurrent = Math.min(Math.max(0, Math.floor(current)), safeTotal);

  return { safeCurrent, safeTotal };
}

export function Progress({ accessibleLabel, current, total, variant = 'segments' }: ProgressProps) {
  const { safeCurrent, safeTotal } = getProgressValues(current, total);
  const isDots = variant === 'dots';

  return (
    <div className={isDots ? styles['dots'] : styles['progress']}>
      <progress
        aria-label={accessibleLabel}
        aria-valuemax={safeTotal}
        aria-valuemin={0}
        aria-valuenow={safeCurrent}
        className={styles['native']}
        max={safeTotal}
        value={safeCurrent}
      />
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
