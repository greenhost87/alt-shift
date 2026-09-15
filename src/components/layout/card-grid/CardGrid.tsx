import type { ReactNode } from 'react';
import { Grid } from 'reshaped';

type CardGridProps = {
  children: ReactNode;
};

export function CardGrid({ children }: CardGridProps) {
  return (
    <Grid
      columnGap={4}
      columns={{ s: 'minmax(0, 1fr)', l: 'repeat(2, minmax(0, 1fr))' }}
      rowGap={6}
      width="100%"
    >
      {children}
    </Grid>
  );
}
