import * as m from '../../../paraglide/messages.js';
import type { StorageStatus } from '../../../system/state/application-store';
import styles from './StorageStatus.module.css';

type StorageStatusMessageProps = {
  status: StorageStatus;
};

export function StorageStatusMessage({ status }: StorageStatusMessageProps) {
  if (status === 'invalid') {
    return (
      <p className={styles['message']} role="alert">
        {m.applications_storage_invalid()}
      </p>
    );
  }
  if (status === 'unavailable') {
    return (
      <p className={styles['message']} role="alert">
        {m.applications_storage_unavailable()}
      </p>
    );
  }
  return null;
}
