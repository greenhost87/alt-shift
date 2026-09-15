import { Button } from '../../ui/button/Button';
import { CopyIcon, DeleteIcon } from '../../ui/icon/Icon';
import styles from './ApplicationCard.module.css';

type ApplicationCardProps = {
  letter: string;
  onCopy: () => void;
  onDelete: () => void;
};

export function ApplicationCard({ letter, onCopy, onDelete }: ApplicationCardProps) {
  return (
    <div className={styles['card']}>
      <p className={styles['letter']}>{letter}</p>
      <div aria-hidden="true" className={styles['fade']} />
      <div className={styles['actions']}>
        <Button
          icon={<DeleteIcon />}
          onClick={onDelete}
          size="compact"
          type="button"
          variant="ghost"
        >
          Delete
        </Button>
        <Button
          icon={<CopyIcon />}
          iconPosition="end"
          onClick={onCopy}
          size="compact"
          type="button"
          variant="ghost"
        >
          Copy to clipboard
        </Button>
      </div>
    </div>
  );
}
