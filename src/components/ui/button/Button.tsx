import type { KeyboardEvent, MouseEvent, ReactNode, Ref } from 'react';
import { Actionable } from 'reshaped';
import type { ActionableRef } from 'reshaped';
import styles from './Button.module.css';

const BUTTON_VARIANTS = ['primary', 'secondary', 'ghost', 'destructive'] as const;
const BUTTON_SIZES = ['compact', 'medium', 'large', 'icon'] as const;
type ButtonVariant = (typeof BUTTON_VARIANTS)[number];
type ButtonSize = (typeof BUTTON_SIZES)[number];
type ButtonInteractionEvent = KeyboardEvent<HTMLElement> | MouseEvent<HTMLElement>;

type ButtonProps = {
  ariaDisabled?: boolean;
  ariaLabel?: string;
  children?: ReactNode;
  disabled?: boolean;
  endIcon?: ReactNode;
  href?: string;
  icon?: ReactNode;
  loading?: boolean | undefined;
  onClick?: (event: ButtonInteractionEvent) => void;
  ref?: Ref<ActionableRef>;
  size?: ButtonSize;
  submit?: true;
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

function getDisabled(disabled: boolean | undefined, loading: boolean) {
  return Boolean(disabled) || loading;
}

function getAriaDisabled(ariaDisabled: boolean | undefined, disabled: boolean) {
  return Boolean(ariaDisabled) || disabled;
}

function getButtonVariant(variant: ButtonVariant | undefined) {
  return variant ?? 'primary';
}

function getButtonSize(size: ButtonSize | undefined, variant: ButtonVariant) {
  return size ?? (variant === 'ghost' ? 'compact' : 'medium');
}

function renderButtonContent(
  children: ReactNode,
  icon: ReactNode,
  endIcon: ReactNode,
  loading: boolean,
) {
  return (
    <span className={loading ? styles['hidden'] : styles['content']}>
      {icon ? <span className={styles['icon']}>{icon}</span> : null}
      {children}
      {endIcon ? <span className={styles['icon']}>{endIcon}</span> : null}
    </span>
  );
}

export function Button({
  ariaDisabled,
  ariaLabel,
  children,
  disabled,
  endIcon,
  href,
  icon,
  loading,
  onClick,
  ref,
  size,
  submit,
  variant,
}: ButtonProps) {
  const resolvedLoading = Boolean(loading);
  const resolvedVariant = getButtonVariant(variant);
  const accessibleLabel = getAccessibleLabel(ariaLabel, children);
  validateAccessibleLabel(accessibleLabel, children, resolvedLoading);
  const statefulAccessibleLabel = getStatefulAccessibleLabel(accessibleLabel, resolvedLoading);
  const resolvedSize = getButtonSize(size, resolvedVariant);
  const resolvedDisabled = getDisabled(disabled, resolvedLoading);

  return (
    <Actionable
      attributes={{
        'aria-busy': resolvedLoading,
        'aria-disabled': getAriaDisabled(ariaDisabled, resolvedDisabled),
        'aria-label': statefulAccessibleLabel,
      }}
      className={[styles['button'], styles[resolvedVariant], BUTTON_SIZE_CLASS_NAMES[resolvedSize]]}
      disabled={resolvedDisabled}
      href={href}
      onClick={onClick}
      ref={ref}
      touchHitbox={BUTTON_TOUCH_HITBOX[resolvedSize]}
      type={href ? undefined : submit ? 'submit' : 'button'}
    >
      {renderButtonContent(children, icon, endIcon, resolvedLoading)}
      {resolvedLoading ? <span className={styles['spinner']} aria-hidden="true" /> : null}
    </Actionable>
  );
}
