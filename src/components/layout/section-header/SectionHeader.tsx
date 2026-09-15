import type { ReactNode } from 'react';
import { Text, View } from 'reshaped';
import styles from './SectionHeader.module.css';

type SectionHeaderProps = {
  action?: ReactNode;
  level?: 'page' | 'section';
  muted?: boolean;
  title: string;
};

export function SectionHeader({
  action,
  level = 'page',
  muted = false,
  title,
}: SectionHeaderProps) {
  const isSection = level === 'section';

  return (
    <View
      align={{ s: 'start', m: 'center' }}
      borderBottom
      borderColor="neutral-faded"
      className={styles['header']}
      direction="row"
      gap={4}
      justify="space-between"
      minHeight={{
        s: 'auto',
        m: isSection
          ? 'var(--rs-unit-section-header-height-small)'
          : 'var(--rs-unit-section-header-height)',
      }}
      paddingBottom={{ s: 4, m: isSection ? 3 : 4 }}
    >
      <Text
        as="h1"
        color={muted ? 'neutral-faded' : 'neutral'}
        variant={level === 'section' ? 'headline-2' : { s: 'headline-2', m: 'headline-1' }}
      >
        {title}
      </Text>
      {action ? <div className={styles['action']}>{action}</div> : null}
    </View>
  );
}
