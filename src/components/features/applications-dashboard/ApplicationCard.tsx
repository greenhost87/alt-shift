import { Link } from '@tanstack/react-router';
import * as m from '../../../paraglide/messages.js';
import type { StoredApplication } from '../../../system/applications/schema';
import { Button } from '../../ui/button/Button';
import { CopyButton } from '../../ui/button/CopyButton';
import { Icon } from '../../ui/icon/Icon';
import styles from './ApplicationCard.module.css';

type ApplicationCardProps = {
  application: StoredApplication;
  onCopy: (letter: string) => Promise<boolean>;
  onDelete: (applicationId: string) => void;
};

export function ApplicationCard({ application, onCopy, onDelete }: ApplicationCardProps) {
  return (
    <article className={styles['card']}>
      <Link
        aria-label={m.open_application({
          role: application.role,
          company: application.company,
        })}
        className={styles['detailsLink']}
        params={{ applicationId: application.id }}
        to="/applications/$applicationId"
      >
        <p className={styles['letter']}>{application.letter}</p>
        <div aria-hidden="true" className={styles['fade']} />
      </Link>
      <div className={styles['actions']}>
        <Button
          icon={
            <Icon viewBox="0 0 20 20">
              <path d="M7.5 2.5h5m-8.33 3.33h11.66m-1.3 0-.58 9.23a1.67 1.67 0 0 1-1.66 1.57H7.7a1.67 1.67 0 0 1-1.66-1.57l-.58-9.23m2.87 3.34v4.16m3.34-4.16v4.16" />
            </Icon>
          }
          onClick={() => {
            onDelete(application.id);
          }}
          variant="ghost"
        >
          {m.delete()}
        </Button>
        <CopyButton onClick={async () => onCopy(application.letter)} />
      </div>
    </article>
  );
}

export function ApplicationCardPlaceholder() {
  return (
    <span
      className={[styles['card'], styles['loadingCard']].join(' ')}
      data-testid="application-card-placeholder"
    >
      <span className={styles['loadingCopy']}>
        <span className={styles['loadingLine']} />
        <span className={styles['loadingLine']} />
        <span className={styles['loadingLineShort']} />
      </span>
      <span className={styles['loadingActions']}>
        <span className={styles['loadingAction']} />
        <span className={styles['loadingAction']} />
      </span>
    </span>
  );
}
