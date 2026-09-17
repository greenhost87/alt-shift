import type { ReactNode } from 'react';
import styles from './Workspace.module.css';

type WorkspaceProps = {
  primary: ReactNode;
  secondary: ReactNode;
  secondaryClassName: string | undefined;
};

export function Workspace({ primary, secondary, secondaryClassName }: WorkspaceProps) {
  const secondaryClasses = [styles['secondary'], secondaryClassName ?? ''].join(' ');
  return (
    <div className={styles['workspace']}>
      <section className={styles['primary']}>{primary}</section>
      <section className={secondaryClasses}>{secondary}</section>
    </div>
  );
}
