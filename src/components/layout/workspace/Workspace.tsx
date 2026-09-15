import type { ReactNode } from 'react';
import { Grid, View } from 'reshaped';

type WorkspaceProps = {
  primary: ReactNode;
  secondary: ReactNode;
};

export function Workspace({ primary, secondary }: WorkspaceProps) {
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
        borderRadius="large"
        minHeight={{ s: 'var(--rs-unit-panel-height-mobile)', l: 'var(--rs-unit-panel-height)' }}
        minWidth={0}
        padding={{ s: 4, l: 6 }}
      >
        {secondary}
      </View>
    </Grid>
  );
}
