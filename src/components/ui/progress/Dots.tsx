import styles from './Dots.module.css';

type ProgressDotsProps = {
  accessibleLabel: string;
  current: number;
  total: number;
};

export function ProgressDots({ accessibleLabel, current, total }: ProgressDotsProps) {
  const safeTotal = Math.max(1, Math.floor(total));
  const safeCurrent = Math.min(Math.max(0, Math.floor(current)), safeTotal);

  return (
    <div
      aria-label={accessibleLabel}
      aria-valuemax={safeTotal}
      aria-valuemin={0}
      aria-valuenow={safeCurrent}
      className={styles['dots']}
      role="progressbar"
    >
      {Array.from({ length: safeTotal }, (_, index) => (
        <span
          className={index < safeCurrent ? styles['complete'] : styles['incomplete']}
          key={index}
        />
      ))}
    </div>
  );
}
