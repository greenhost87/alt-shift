import { forwardRef } from 'react';
import type { KeyboardEvent, MouseEvent, ReactNode } from 'react';
import { Actionable } from 'reshaped';
import type { ActionableRef } from 'reshaped';
import styles from './Button.module.css';

const BUTTON_VARIANTS = ['primary', 'secondary', 'ghost'] as const;
const BUTTON_SIZES = ['compact', 'medium', 'large', 'icon'] as const;
const BUTTON_ICON_POSITIONS = ['start', 'end'] as const;

export type ButtonVariant = (typeof BUTTON_VARIANTS)[number];
export type ButtonSize = (typeof BUTTON_SIZES)[number];
type ButtonIconPosition = (typeof BUTTON_ICON_POSITIONS)[number];

type ButtonInteractionEvent = KeyboardEvent<HTMLElement> | MouseEvent<HTMLElement>;

type ButtonProps = {
  ariaLabel?: string;
  children?: ReactNode;
  disabled?: boolean;
  fullWidth?: boolean;
  icon?: ReactNode;
  iconPosition?: ButtonIconPosition;
  loading?: boolean;
  onClick?: (event: ButtonInteractionEvent) => void;
  size?: ButtonSize;
  type: 'button' | 'submit';
  variant?: ButtonVariant;
};

export const Button = forwardRef<ActionableRef, ButtonProps>(function Button(
  {
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
  },
  ref,
) {
  const accessibleLabel = ariaLabel ?? (typeof children === 'string' ? children : undefined);
  const sizeClassName = size === 'icon' ? styles['iconButton'] : styles[size];

  if (children == null && !accessibleLabel) {
    throw new Error('An icon-only Button requires ariaLabel');
  }

  if (loading && !accessibleLabel) {
    throw new Error('A loading Button requires string children or ariaLabel');
  }

  const statefulAccessibleLabel =
    loading && accessibleLabel ? `${accessibleLabel}, loading` : accessibleLabel;

  return (
    <Actionable
      attributes={{ 'aria-label': statefulAccessibleLabel, 'aria-busy': loading }}
      className={[styles['button'], styles[variant], sizeClassName]}
      disabled={disabled || loading}
      fullWidth={fullWidth}
      onClick={onClick}
      ref={ref}
      touchHitbox={size === 'compact' || size === 'icon'}
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
});
