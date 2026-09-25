import { PlusIcon } from '../icon/Icon';
import { Button } from './Button';

type CreateButtonProps = {
  disabled?: boolean;
  label: string;
  onClick: () => void;
  prominent?: boolean;
};

export function CreateButton({
  disabled = false,
  label,
  onClick,
  prominent = false,
}: CreateButtonProps) {
  return (
    <Button
      disabled={disabled}
      onClick={onClick}
      size={prominent ? 'large' : 'medium'}
      icon={<PlusIcon />}
    >
      {label}
    </Button>
  );
}
