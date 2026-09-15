import type { ReactNode } from 'react';
import { Actionable } from 'reshaped';
import styles from './Button.module.css';

const BUTTON_VARIANTS = ['primary', 'secondary', 'ghost'] as const;
const BUTTON_SIZES = ['compact', 'medium', 'large', 'icon'] as const;
const BUTTON_ICON_POSITIONS = ['start', 'end'] as const;

export type ButtonVariant = (typeof BUTTON_VARIANTS)[number];
export type ButtonSize = (typeof BUTTON_SIZES)[number];
type ButtonIconPosition = (typeof BUTTON_ICON_POSITIONS)[number];

type ButtonProps = {
  ariaLabel?: string;
  children?: ReactNode;
  disabled?: boolean;
  fullWidth?: boolean;
  icon?: ReactNode;
  iconPosition?: ButtonIconPosition;
  loading?: boolean;
  onClick?: () => void;
  size?: ButtonSize;
  type: 'button' | 'submit';
  variant?: ButtonVariant;
};

export function Button({
  ariaLabel,
  children,
  disabled = false,
  fullWidth = false,
  icon,
  iconPosition = 'start',
  loading = false,
  onClick,
  size = 'medium',
  type,
  variant = 'primary',
}: ButtonProps) {
  const accessibleLabel = ariaLabel ?? (typeof children === 'string' ? children : undefined);
  const sizeClassName = size === 'icon' ? styles['iconButton'] : styles[size];

  return (
    <Actionable
      attributes={{ 'aria-label': accessibleLabel, 'aria-busy': loading }}
      className={[styles['button'], styles[variant], sizeClassName]}
      disabled={disabled || loading}
      fullWidth={fullWidth}
      onClick={onClick}
      type={type}
    >
      <span className={loading ? styles['hidden'] : styles['content']}>
        {icon && iconPosition === 'start' ? <span className={styles['icon']}>{icon}</span> : null}
        {children}
        {icon && iconPosition === 'end' ? <span className={styles['icon']}>{icon}</span> : null}
      </span>
      {loading ? <span className={styles['spinner']} aria-hidden="true" /> : null}
    </Actionable>
  );
}
