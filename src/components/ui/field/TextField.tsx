import { FormControl, TextField as ReshapedTextField } from 'reshaped';
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
  return (
    <FormControl disabled={disabled} hasError={Boolean(error)} id={id} size="large">
      <FormControl.Label>{label}</FormControl.Label>
      <div className={error ? styles['controlError'] : styles['control']}>
        <ReshapedTextField
          inputAttributes={{ autoComplete }}
          name={name}
          onChange={({ value: nextValue }: { value: string }) => onChange(nextValue)}
          placeholder={placeholder}
          size="large"
          value={value}
          variant="headless"
        />
      </div>
      {error && <FormControl.Error>{error}</FormControl.Error>}
      {!error && hint && <FormControl.Helper>{hint}</FormControl.Helper>}
    </FormControl>
  );
}
