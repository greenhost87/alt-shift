import { FormControl, TextArea as ReshapedTextArea } from 'reshaped';
import styles from './Field.module.css';

type TextAreaFieldProps = {
  autoFocus?: boolean;
  disabled?: boolean;
  error?: string;
  hint?: string;
  id: string;
  label: string;
  maxLength?: number;
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
  maxLength,
  name,
  onChange,
  placeholder,
  value,
}: TextAreaFieldProps) {
  return (
    <div className={styles['field']}>
      <FormControl disabled={disabled} hasError={Boolean(error)} id={id} size="large">
        <FormControl.Label>{label}</FormControl.Label>
        <div className={error ? styles['textareaError'] : styles['textarea']}>
          <ReshapedTextArea
            inputAttributes={{ autoFocus, maxLength }}
            name={name}
            onChange={({ value: nextValue }: { value: string }) => onChange(nextValue)}
            placeholder={placeholder}
            resize="none"
            size="large"
            value={value}
            variant="headless"
          />
        </div>
        {error && <FormControl.Error>{error}</FormControl.Error>}
        {!error && hint && <FormControl.Helper>{hint}</FormControl.Helper>}
      </FormControl>
    </div>
  );
}
