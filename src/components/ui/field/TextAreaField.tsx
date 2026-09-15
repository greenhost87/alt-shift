import { FormControl, Text } from 'reshaped';
import styles from './Field.module.css';

type TextAreaFieldProps = {
  autoFocus?: boolean;
  characterLimit: number;
  disabled?: boolean;
  hint?: string;
  id: string;
  label: string;
  name: string;
  onChange: (value: string) => void;
  placeholder?: string;
  value: string;
};

function getDescriptionId(id: string, hasError: boolean, hasCaption: boolean) {
  return hasCaption ? `${id}-${hasError ? 'error' : 'caption'}` : undefined;
}

function getLengthError(value: string, characterLimit: number) {
  return value.length > characterLimit ? `${value.length}/${characterLimit}` : undefined;
}

export function TextAreaField({
  autoFocus = false,
  characterLimit,
  disabled = false,
  hint,
  id,
  label,
  name,
  onChange,
  placeholder,
  value,
}: TextAreaFieldProps) {
  const error = getLengthError(value, characterLimit);
  const caption = error ?? hint;
  const hasError = Boolean(error);
  const descriptionId = getDescriptionId(id, hasError, Boolean(caption));

  return (
    <div className={styles['field']}>
      <FormControl disabled={disabled} hasError={hasError} id={id} size="large">
        <label htmlFor={id}>{label}</label>
        <textarea
          aria-describedby={descriptionId}
          aria-invalid={hasError}
          autoFocus={autoFocus}
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
            attributes={{ id: descriptionId }}
            color={error ? 'critical' : 'neutral-faded'}
            variant="caption-1"
          >
            {caption}
          </Text>
        ) : null}
      </FormControl>
    </div>
  );
}
