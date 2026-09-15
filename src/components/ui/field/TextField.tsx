import { FormControl, Text } from 'reshaped';
import type { FieldProps } from './Field.types';
import styles from './Field.module.css';
import { getLengthError } from './length';

export function TextField(props: FieldProps) {
  const error = getLengthError(props.value, props.characterLimit);
  const descriptionId = error ? `${props.id}-error` : undefined;

  return (
    <div className={styles['field']}>
      <FormControl disabled={props.disabled} hasError={Boolean(error)} id={props.id} size="large">
        <label htmlFor={props.id}>{props.label}</label>
        <input
          aria-describedby={descriptionId}
          aria-invalid={Boolean(error)}
          className={styles['control']}
          disabled={props.disabled}
          id={props.id}
          name={props.name}
          onChange={(event) => {
            props.onChange(event.currentTarget.value);
          }}
          placeholder={props.placeholder}
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
