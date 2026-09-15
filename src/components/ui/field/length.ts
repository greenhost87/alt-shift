export function getLengthError(value: string, characterLimit: number) {
  return value.length > characterLimit ? `${value.length}/${characterLimit}` : undefined;
}
