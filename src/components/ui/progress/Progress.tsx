import styles from './Progress.module.css';

type ProgressProps = {
  accessibleLabel: string;
  current: number;
  total: number;
};

export function Progress({ accessibleLabel, current, total }: ProgressProps) {
  const safeTotal = Math.max(1, Math.floor(total));
  const safeCurrent = Math.min(Math.max(0, Math.floor(current)), safeTotal);

  return (
    <div
      aria-label={accessibleLabel}
      aria-valuemax={safeTotal}
      aria-valuemin={0}
      aria-valuenow={safeCurrent}
      className={styles['progress']}
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
      <span className={styles['label']}>
        {safeCurrent} out of {safeTotal}
      </span>
    </div>
  );
}
