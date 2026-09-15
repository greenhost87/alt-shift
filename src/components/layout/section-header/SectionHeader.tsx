import type { ReactNode } from 'react';
import { Text, View } from 'reshaped';

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
  return (
    <View
      align={{ s: 'start', m: 'center' }}
      borderBottom
      borderColor="neutral-faded"
      direction="row"
      gap={4}
      justify="space-between"
      minHeight={{ s: 'auto', m: 'var(--rs-unit-section-header-height)' }}
      paddingBottom={{ s: 4, m: 3.75 }}
    >
      <Text
        as="h1"
        color={muted ? 'neutral-faded' : 'neutral'}
        variant={level === 'section' ? 'headline-2' : { s: 'headline-2', m: 'headline-1' }}
      >
        {title}
      </Text>
      {action}
    </View>
  );
}
