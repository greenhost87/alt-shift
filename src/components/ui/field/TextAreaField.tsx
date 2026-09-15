import { FormControl } from 'reshaped';
import styles from './Field.module.css';

type TextAreaFieldProps = {
  autoFocus?: boolean;
  disabled?: boolean;
  error?: string | undefined;
  hint?: string;
  id: string;
  label: string;
  name: string;
  onChange: (value: string) => void;
  placeholder?: string;
  value: string;
};

export function TextAreaField({
  autoFocus = false,
  disabled = false,
  error,
  hint,
  id,
  label,
  name,
  onChange,
  placeholder,
  value,
}: TextAreaFieldProps) {
  const descriptionId = error ? `${id}-error` : hint ? `${id}-caption` : undefined;

  return (
    <div className={styles['field']}>
      <FormControl disabled={disabled} hasError={Boolean(error)} id={id} size="large">
        <label htmlFor={id}>{label}</label>
        <textarea
          aria-describedby={descriptionId}
          aria-invalid={Boolean(error)}
          autoFocus={autoFocus}
          className={error ? styles['textareaError'] : styles['textarea']}
          disabled={disabled}
          id={id}
          name={name}
          onChange={(event) => onChange(event.currentTarget.value)}
          placeholder={placeholder}
          value={value}
        />
        {error ? <FormControl.Error>{error}</FormControl.Error> : null}
        {!error && hint ? <FormControl.Helper>{hint}</FormControl.Helper> : null}
      </FormControl>
    </div>
  );
}
