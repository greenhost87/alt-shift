import { CheckIcon } from '../icon/Icon';
import styles from './ProgressDone.module.css';

export function ProgressDone() {
  return (
    <span aria-hidden="true" className={styles['badge']}>
      <CheckIcon />
    </span>
  );
}
