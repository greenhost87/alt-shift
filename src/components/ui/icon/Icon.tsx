import type { ReactNode } from 'react';

type IconProps = {
  children: ReactNode;
  strokeWidth?: number;
  viewBox: string;
};

export function Icon({ children, strokeWidth = 1.67, viewBox }: IconProps) {
  return (
    <svg
      aria-hidden="true"
      fill="none"
      stroke="currentColor"
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={strokeWidth}
      viewBox={viewBox}
    >
      {children}
    </svg>
  );
}

export function CopyIcon() {
  return (
    <Icon viewBox="0 0 20 20">
      <path d="M7.5 7.5V5.83c0-.92.75-1.66 1.67-1.66h5c.92 0 1.66.74 1.66 1.66v5c0 .92-.74 1.67-1.66 1.67H12.5" />
      <rect height="8.33" rx="1.67" width="8.33" x="4.17" y="7.5" />
    </Icon>
  );
}

export function DeleteIcon() {
  return (
    <Icon viewBox="0 0 20 20">
      <path d="M7.5 2.5h5m-8.33 3.33h11.66m-1.3 0-.58 9.23a1.67 1.67 0 0 1-1.66 1.57H7.7a1.67 1.67 0 0 1-1.66-1.57l-.58-9.23m2.87 3.34v4.16m3.34-4.16v4.16" />
    </Icon>
  );
}

export function PlusIcon() {
  return (
    <Icon viewBox="0 0 20 20">
      <path d="M10 4.17v11.66M4.17 10h11.66" />
    </Icon>
  );
}

