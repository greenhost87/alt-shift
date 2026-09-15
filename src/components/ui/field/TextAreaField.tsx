import { FormControl, Text } from 'reshaped';
import type { FieldProps } from './Field.types';
import styles from './Field.module.css';
import { getLengthError } from './length';

function getDescriptionId(id: string, hasError: boolean, hasCaption: boolean) {
  return hasCaption ? `${id}-${hasError ? 'error' : 'caption'}` : undefined;
}

export function TextAreaField({
  characterLimit,
  disabled = false,
  id,
  label,
  name,
  onChange,
  placeholder,
  value,
}: FieldProps) {
  const error = getLengthError(value, characterLimit);
  const caption = error ?? `${value.length}/${characterLimit}`;
  const hasError = Boolean(error);
  const descriptionId = getDescriptionId(id, hasError, Boolean(caption));

  return (
    <div className={styles['field']}>
      <FormControl disabled={disabled} hasError={hasError} id={id} size="large">
        <label htmlFor={id}>{label}</label>
        <textarea
          aria-describedby={descriptionId}
          aria-invalid={hasError}
          className={error ? styles['textareaError'] : styles['textarea']}
          disabled={disabled}
          id={id}
          name={name}
          onChange={(event) => {
            onChange(event.currentTarget.value);
          }}
          placeholder={placeholder}
          value={value}
        />
        {caption ? (
          <Text
            as="p"
            attributes={{ id: descriptionId, role: error ? 'alert' : undefined }}
            className={styles['caption']}
            variant="body-2"
          >
            {caption}
          </Text>
        ) : null}
      </FormControl>
    </div>
  );
}
