import type { ReactNode } from 'react';
import { Grid, View } from 'reshaped';

type WorkspaceProps = {
  primary: ReactNode;
  secondary: ReactNode;
  secondaryClassName: string | undefined;
};

export function Workspace({ primary, secondary, secondaryClassName }: WorkspaceProps) {
  const secondaryMinHeight = {
    s: 'min(var(--rs-unit-panel-height-mobile), var(--rs-unit-workspace-secondary-max-height, 100dvh))',
    l: 'min(var(--rs-unit-panel-height), var(--rs-unit-workspace-secondary-max-height, 100dvh))',
  };
  return (
    <Grid
      columns={{ s: 'minmax(0, 1fr)', l: 'repeat(2, minmax(0, 1fr))' }}
      gap={{ s: 6, l: 8 }}
      width="100%"
    >
      <View as="section" minWidth={0}>
        {primary}
      </View>
      <View
        as="section"
        backgroundColor="neutral-faded"
        className={secondaryClassName}
        borderRadius="large"
        minHeight={secondaryMinHeight}
        minWidth={0}
        padding={{ s: 4, l: 6 }}
      >
        {secondary}
      </View>
    </Grid>
  );
}
