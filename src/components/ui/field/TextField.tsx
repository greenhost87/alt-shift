import { FormControl, Text } from 'reshaped';
import type { FieldProps } from './Field.types';
import styles from './Field.module.css';
import { getFieldError } from './length';

export function TextField(props: FieldProps) {
  const error = getFieldError(props.value, props.characterLimit, props.requiredMessage);
  const descriptionId = error ? `${props.id}-error` : undefined;
  const required = props.requiredMessage !== undefined;

  return (
    <div className={styles['field']}>
      <FormControl
        disabled={props.disabled}
        hasError={Boolean(error)}
        id={props.id}
        required={required}
        size="large"
      >
        <label htmlFor={props.id}>{props.label}</label>
        <input
          aria-describedby={descriptionId}
          aria-invalid={Boolean(error)}
          className={error ? styles['controlError'] : styles['control']}
          disabled={props.disabled}
          id={props.id}
          name={props.name}
          onChange={(event) => {
            props.onChange(event.currentTarget.value);
          }}
          placeholder={props.placeholder}
          required={required}
          type="text"
          value={props.value}
        />
        {error ? (
          <Text
            as="p"
            attributes={{ id: descriptionId, role: 'alert' }}
            className={styles['caption']}
            variant="body-2"
          >
            {error}
          </Text>
        ) : null}
      </FormControl>
    </div>
  );
}
