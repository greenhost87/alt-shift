import { FormControl } from 'reshaped';
import styles from './Field.module.css';

type TextFieldProps = {
  autoComplete?: string;
  disabled?: boolean;
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
  id,
  label,
  name,
  onChange,
  placeholder,
  value,
}: TextFieldProps) {
  return (
    <div className={styles['field']}>
      <FormControl disabled={disabled} id={id} size="large">
        <label htmlFor={id}>{label}</label>
        <input
          aria-invalid={false}
          autoComplete={autoComplete}
          className={styles['control']}
          disabled={disabled}
          id={id}
          name={name}
          onChange={(event) => {
            onChange(event.currentTarget.value);
          }}
          placeholder={placeholder}
          type="text"
          value={value}
        />
      </FormControl>
    </div>
  );
}
