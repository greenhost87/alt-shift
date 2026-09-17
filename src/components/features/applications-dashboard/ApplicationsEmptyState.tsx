import * as m from '../../../paraglide/messages.js';
import { CreateButton } from '../../ui/button/CreateButton';
import { Icon } from '../../ui/icon/Icon';
import styles from './ApplicationsEmptyState.module.css';

type ApplicationsEmptyStateProps = {
  onCreate: () => void;
};

export function ApplicationsEmptyState({ onCreate }: ApplicationsEmptyStateProps) {
  return (
    <div className={styles['emptyState']}>
      <div aria-hidden="true" className={styles['visual']}>
        <Icon viewBox="0 0 64 64" strokeWidth={2}>
          <rect x="16" y="6" width="32" height="44" rx="4" />
          <path d="M24 17h16M24 25h16M24 33h8" />
          <path d="M8 30v24a4 4 0 0 0 4 4h40a4 4 0 0 0 4-4V30L32 46Z" />
        </Icon>
      </div>
      <div className={styles['copy']}>
        <h2 className={styles['title']}>{m.no_applications_yet()}</h2>
        <p className={styles['description']}>{m.empty_applications_description()}</p>
      </div>
      <div className={styles['action']}>
        <CreateButton label={m.create_first_application()} onClick={onCreate} prominent />
      </div>
    </div>
  );
}
