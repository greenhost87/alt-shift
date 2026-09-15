import { Text } from 'reshaped';

const HEADING_KINDS = ['page', 'section', 'placeholder', 'message'] as const;
type HeadingProps = {
  kind: (typeof HEADING_KINDS)[number];
  level?: 'h1' | 'h2';
  children: string;
};

export function Heading({ kind, level = 'h1', children }: HeadingProps) {
  const variant = kind === 'message' ? 'featured-3' : 'headline-2';
  return (
    <Text as={level} color={kind === 'placeholder' ? 'neutral-faded' : 'neutral'} variant={kind === 'page' ? { s: 'headline-2', m: 'headline-1' } : variant}>
      {children}
    </Text>
  );
}
