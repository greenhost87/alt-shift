import { Progress } from '../../ui/progress/Progress';
import { ProgressDone } from '../../ui/progress/ProgressDone';

type GenerationStatusProps = {
  current: number;
  total: number;
};

export function GenerationStatus({ current, total }: GenerationStatusProps) {
  const safeTotal = Math.max(1, Math.floor(total));
  const safeCurrent = Math.min(Math.max(0, Math.floor(current)), safeTotal);
  const accessibleLabel = `${safeCurrent} of ${safeTotal} applications generated`;
  const isComplete = safeCurrent >= safeTotal;

  return (
    <>
      <span>
        {safeCurrent}/{safeTotal} applications generated
      </span>
      {isComplete ? (
        <ProgressDone />
      ) : (
        <Progress
          accessibleLabel={accessibleLabel}
          current={safeCurrent}
          total={safeTotal}
          variant="dots"
        />
      )}
    </>
  );
}
