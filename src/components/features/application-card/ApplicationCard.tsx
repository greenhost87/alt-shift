import { Button } from '../../ui/button/Button';
import styles from './ApplicationCard.module.css';

type ApplicationCardProps = {
  letter: string;
  onCopy: () => void;
  onDelete: () => void;
};

const copyIcon = (
  <svg aria-hidden="true" fill="none" viewBox="0 0 20 20">
    <path
      d="M7.5 7.5V5.83c0-.92.75-1.66 1.67-1.66h5c.92 0 1.66.74 1.66 1.66v5c0 .92-.74 1.67-1.66 1.67H12.5"
      stroke="currentColor"
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth="1.67"
    />
    <rect
      height="8.33"
      rx="1.67"
      stroke="currentColor"
      strokeWidth="1.67"
      width="8.33"
      x="4.17"
      y="7.5"
    />
  </svg>
);

const deleteIcon = (
  <svg aria-hidden="true" fill="none" viewBox="0 0 20 20">
    <path
      d="M7.5 2.5h5m-8.33 3.33h11.66m-1.3 0-.58 9.23a1.67 1.67 0 0 1-1.66 1.57H7.7a1.67 1.67 0 0 1-1.66-1.57l-.58-9.23m2.87 3.34v4.16m3.34-4.16v4.16"
      stroke="currentColor"
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth="1.67"
    />
  </svg>
);

export function ApplicationCard({ letter, onCopy, onDelete }: ApplicationCardProps) {
  return (
    <div className={styles['card']}>
      <p className={styles['letter']}>{letter}</p>
      <div aria-hidden="true" className={styles['fade']} />
      <div className={styles['actions']}>
        <Button icon={deleteIcon} onClick={onDelete} size="compact" type="button" variant="ghost">
          Delete
        </Button>
        <Button
          icon={copyIcon}
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
