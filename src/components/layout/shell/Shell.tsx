import { createLink, Link } from '@tanstack/react-router';
import type { ReactNode } from 'react';
import * as m from '../../../paraglide/messages.js';
import { withBasePath } from '../../../system/config/base-path';
import { BASE_PATH } from '../../../system/config/environment';
import { useApplicationConfig, usePersistenceStore } from '../../../system/state/application';
import { selectApplicationCount } from '../../../system/state/persistence-store';
import { brandSize } from '../../../system/theme/tokens.ts';
import { Button } from '../../ui/button/Button';
import { Icon } from '../../ui/icon/Icon';
import { getProgressValues, Progress } from '../../ui/progress/Progress';
import { LanguageSwitcher } from './LanguageSwitcher';
import styles from './Shell.module.css';

type ShellProps = {
  children: ReactNode;
};

const ButtonLink = createLink(Button);

export function Shell({ children }: ShellProps) {
  const applicationLimit = useApplicationConfig().applicationLimit;
  const applicationCount = usePersistenceStore(selectApplicationCount);
  const serverApplicationLimitReached = usePersistenceStore(
    (state) => state.serverApplicationLimitReached,
  );
  const displayedApplicationCount = serverApplicationLimitReached
    ? applicationLimit
    : applicationCount;
  const { safeCurrent, safeTotal } = getProgressValues(displayedApplicationCount, applicationLimit);
  const accessibleLabel = m.applications_generated_accessible({
    current: safeCurrent,
    total: safeTotal,
  });
  const isComplete = safeCurrent >= safeTotal;

  return (
    <div className={styles['page']}>
      <header className={styles['header']}>
        <Link className={styles['brandLink']} to="/">
          <img
            alt="Alt+Shift"
            className={styles['brand']}
            height={brandSize.height}
            src={withBasePath(BASE_PATH, '/brand.svg')}
            width={brandSize.width}
          />
        </Link>
        <div className={styles['controls']}>
          <div className={styles['status']}>
            <Button href={withBasePath(BASE_PATH, '/applications')} variant="ghost">
              {m.applications_generated({ current: safeCurrent, total: safeTotal })}
            </Button>
            {isComplete ? (
              <span aria-hidden="true" className={styles['doneBadge']}>
                <Icon strokeWidth={2} viewBox="0 0 14 12">
                  <path d="m2 6.5 3.5 3.5L12 3" />
                </Icon>
              </span>
            ) : (
              <Progress
                accessibleLabel={accessibleLabel}
                current={safeCurrent}
                total={safeTotal}
                variant="dots"
              />
            )}
          </div>
          <div className={styles['homeControl']}>
            <ButtonLink
              to="/applications"
              icon={
                <Icon viewBox="0 0 20 20">
                  <path d="m2.5 8.33 6.43-5.14a1.67 1.67 0 0 1 2.14 0l6.43 5.14M4.17 7.08v8.09c0 .92.74 1.66 1.66 1.66h2.5v-5h3.34v5h2.5c.92 0 1.66-.74 1.66-1.66V7.08" />
                </Icon>
              }
              variant="secondary"
            >
              {m.my_letters()}
            </ButtonLink>
            <LanguageSwitcher />
          </div>
        </div>
      </header>
      <main className={styles['main']}>{children}</main>
    </div>
  );
}
