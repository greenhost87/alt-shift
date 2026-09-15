import { useNavigate } from '@tanstack/react-router';
import type { ReactNode } from 'react';
import { View } from 'reshaped';
import { useStoredApplications } from '../../../system/applications/storage';
import { brandSize } from '../../../system/theme/tokens.ts';
import { Button } from '../../ui/button/Button';
import { Icon } from '../../ui/icon/Icon';
import { getProgressValues, Progress } from '../../ui/progress/Progress';
import styles from './Shell.module.css';

type ShellProps = {
  children: ReactNode;
};

export function Shell({ children }: ShellProps) {
  const navigate = useNavigate();
  const { applications } = useStoredApplications();
  const returnHome = () => {
    void navigate({ to: '/' });
  };
  const { safeCurrent, safeTotal } = getProgressValues(applications.length, 5);
  const accessibleLabel = `${safeCurrent} of ${safeTotal} applications generated`;
  const isComplete = safeCurrent >= safeTotal;

  return (
    <div className={styles['page']}>
      <View
        align={{ s: 'start', m: 'center' }}
        as="header"
        className={styles['header']}
        direction="row"
        justify="space-between"
        wrap={{ s: true, m: false }}
      >
        <img
          alt="Alt+Shift"
          className={styles['brand']}
          height={brandSize.height}
          src="/brand.svg"
          width={brandSize.width}
        />
        <View
          align="center"
          className={styles['controls']}
          direction="row"
          gap={{ s: 3, m: 6 }}
          justify="end"
        >
          <View align="center" className={styles['status']} direction="row" gap={{ s: 2, m: 4 }}>
            <span>
              {safeCurrent}/{safeTotal} applications generated
            </span>
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
          </View>
          <Button
            ariaLabel="Home"
            icon={
              <Icon viewBox="0 0 20 20">
                <path d="m2.5 8.33 6.43-5.14a1.67 1.67 0 0 1 2.14 0l6.43 5.14M4.17 7.08v8.09c0 .92.74 1.66 1.66 1.66h2.5v-5h3.34v5h2.5c.92 0 1.66-.74 1.66-1.66V7.08" />
              </Icon>
            }
            onClick={returnHome}
            size="icon"
            type="button"
            variant="secondary"
          />
        </View>
      </View>
      <main className={styles['main']}>{children}</main>
    </div>
  );
}
