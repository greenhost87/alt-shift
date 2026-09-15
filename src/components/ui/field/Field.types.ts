export type FieldProps = {
  characterLimit: number;
  disabled?: boolean;
  id: string;
  label: string;
  name: string;
  onChange: (value: string) => void;
  placeholder?: string;
  value: string;
};
