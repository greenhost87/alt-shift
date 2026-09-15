import { FormControl } from 'reshaped';
import styles from './Field.module.css';

type TextFieldProps = {
  autoComplete?: string;
  disabled?: boolean;
  error?: string;
  hint?: string;
  id: string;
  label: string;
  name: string;
  onChange: (value: string) => void;
  placeholder?: string;
  value: string;
};

export function TextField({
  autoComplete,
  disabled = false,
  error,
  hint,
  id,
  label,
  name,
  onChange,
  placeholder,
  value,
}: TextFieldProps) {
  const descriptionId = error ? `${id}-error` : hint ? `${id}-caption` : undefined;

  return (
    <div className={styles['field']}>
      <FormControl disabled={disabled} hasError={Boolean(error)} id={id} size="large">
        <label htmlFor={id}>{label}</label>
        <input
          aria-describedby={descriptionId}
          aria-invalid={Boolean(error)}
          autoComplete={autoComplete}
          className={error ? styles['controlError'] : styles['control']}
          disabled={disabled}
          id={id}
          name={name}
          onChange={(event) => onChange(event.currentTarget.value)}
          placeholder={placeholder}
          type="text"
          value={value}
        />
        {error ? <FormControl.Error>{error}</FormControl.Error> : null}
        {!error && hint ? <FormControl.Helper>{hint}</FormControl.Helper> : null}
      </FormControl>
    </div>
  );
}
