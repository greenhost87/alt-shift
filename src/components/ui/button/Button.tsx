import { forwardRef } from 'react';
import type { KeyboardEvent, MouseEvent, ReactNode } from 'react';
import { Actionable } from 'reshaped';
import type { ActionableRef } from 'reshaped';
import styles from './Button.module.css';

const BUTTON_VARIANTS = ['primary', 'secondary', 'ghost'] as const;
const BUTTON_SIZES = ['compact', 'medium', 'large', 'icon'] as const;
const BUTTON_ICON_POSITIONS = ['start', 'end'] as const;

type ButtonVariant = (typeof BUTTON_VARIANTS)[number];
type ButtonSize = (typeof BUTTON_SIZES)[number];
type ButtonIconPosition = (typeof BUTTON_ICON_POSITIONS)[number];

type ButtonInteractionEvent = KeyboardEvent<HTMLElement> | MouseEvent<HTMLElement>;

type ButtonProps = {
  ariaLabel?: string;
  children?: ReactNode;
  disabled?: boolean;
  fullWidth?: boolean;
  icon?: ReactNode;
  iconPosition?: ButtonIconPosition;
  loading?: boolean | undefined;
  onClick?: (event: ButtonInteractionEvent) => void;
  size?: ButtonSize;
  type?: 'button' | 'submit';
  variant?: ButtonVariant;
};

const BUTTON_SIZE_CLASS_NAMES = {
  compact: styles['compact'],
  icon: styles['iconButton'],
  large: styles['large'],
  medium: styles['medium'],
} as const;

const BUTTON_TOUCH_HITBOX = {
  compact: true,
  icon: true,
  large: false,
  medium: false,
} as const;

function getAccessibleLabel(ariaLabel: string | undefined, children: ReactNode) {
  return ariaLabel ?? (typeof children === 'string' ? children : undefined);
}

function validateAccessibleLabel(
  accessibleLabel: string | undefined,
  children: ReactNode,
  loading: boolean,
) {
  if (children == null && !accessibleLabel) {
    throw new Error('An icon-only Button requires ariaLabel');
  }

  if (loading && !accessibleLabel) {
    throw new Error('A loading Button requires string children or ariaLabel');
  }
}

function getStatefulAccessibleLabel(accessibleLabel: string | undefined, loading: boolean) {
  return loading && accessibleLabel ? `${accessibleLabel}, loading` : accessibleLabel;
}

function getDisabled(disabled: boolean, loading: boolean) {
  return disabled || loading;
}

function getButtonSize(size: ButtonSize | undefined, variant: ButtonVariant) {
  return size ?? (variant === 'ghost' ? 'compact' : 'medium');
}

function renderButtonContent(
  children: ReactNode,
  icon: ReactNode,
  iconPosition: ButtonIconPosition,
  loading: boolean,
) {
  return (
    <span className={loading ? styles['hidden'] : styles['content']}>
      {icon && iconPosition === 'start' ? <span className={styles['icon']}>{icon}</span> : null}
      {children}
      {icon && iconPosition === 'end' ? <span className={styles['icon']}>{icon}</span> : null}
    </span>
  );
}

export const Button = forwardRef<ActionableRef, ButtonProps>(function Button(
  {
    ariaLabel,
    children,
    disabled = false,
    fullWidth,
    icon,
    iconPosition = 'start',
    loading = false,
    onClick,
    size,
    type = 'button',
    variant = 'primary',
  },
  ref,
) {
  const accessibleLabel = getAccessibleLabel(ariaLabel, children);
  validateAccessibleLabel(accessibleLabel, children, loading);
  const statefulAccessibleLabel = getStatefulAccessibleLabel(accessibleLabel, loading);
  const resolvedSize = getButtonSize(size, variant);

  return (
    <Actionable
      attributes={{ 'aria-label': statefulAccessibleLabel, 'aria-busy': loading }}
      className={[styles['button'], styles[variant], BUTTON_SIZE_CLASS_NAMES[resolvedSize]]}
      disabled={getDisabled(disabled, loading)}
      fullWidth={fullWidth}
      onClick={onClick}
      ref={ref}
      touchHitbox={BUTTON_TOUCH_HITBOX[resolvedSize]}
      type={type}
    >
      {renderButtonContent(children, icon, iconPosition, loading)}
      {loading ? <span className={styles['spinner']} aria-hidden="true" /> : null}
    </Actionable>
  );
});
