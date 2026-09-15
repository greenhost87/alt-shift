import type { ReactNode } from 'react';
import { View } from 'reshaped';
import { brandSize } from '../../../system/theme/tokens.ts';
import styles from './Shell.module.css';

type ShellProps = {
  action?: ReactNode;
  children: ReactNode;
  status?: ReactNode;
};

export function Shell({ action, children, status }: ShellProps) {
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
        {status || action ? (
          <View
            align="center"
            className={styles['controls']}
            direction="row"
            gap={{ s: 3, m: 6 }}
            justify="end"
          >
            {status ? (
              <View
                align="center"
                className={styles['status']}
                direction="row"
                gap={{ s: 2, m: 4 }}
              >
                {status}
              </View>
            ) : null}
            {action}
          </View>
        ) : null}
      </View>
      <main className={styles['main']}>{children}</main>
    </div>
  );
}
