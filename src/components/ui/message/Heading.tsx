import styles from './Heading.module.css';

const HEADING_KINDS = ['page', 'section', 'placeholder', 'messagePage', 'messageDialog'] as const;
type HeadingProps = {
  kind: (typeof HEADING_KINDS)[number];
  children: string;
};

export function Heading({ kind, children }: HeadingProps) {
  const classes = [styles['heading'], styles[kind]].join(' ');
  if (kind === 'messageDialog') return <h2 className={classes}>{children}</h2>;
  return <h1 className={classes}>{children}</h1>;
}
