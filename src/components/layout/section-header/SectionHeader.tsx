import type { ReactNode } from 'react';
import { Heading } from '../../ui/message/Heading';
import styles from './SectionHeader.module.css';

type SectionHeaderProps = {
  action?: ReactNode;
  level?: 'page' | 'section';
  title: string;
};

export function SectionHeader({ action, level = 'page', title }: SectionHeaderProps) {
  const classes = [styles['header'], styles[level]].join(' ');
  return (
    <header className={classes}>
      <Heading kind={level}>{title}</Heading>
      {action ? <div className={styles['action']}>{action}</div> : null}
    </header>
  );
}
