function getLengthError(value: string, characterLimit: number) {
  return value.length > characterLimit ? `${value.length}/${characterLimit}` : undefined;
}

export function getFieldError(
  value: string,
  characterLimit: number,
  requiredMessage: string | undefined,
) {
  const lengthError = getLengthError(value, characterLimit);
  if (lengthError !== undefined) return lengthError;
  if (requiredMessage !== undefined && value.trim().length === 0) return requiredMessage;
  return undefined;
}
