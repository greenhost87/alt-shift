import { PlusIcon } from '../icon/Icon';
import { Button } from './Button';

type CreateButtonProps = {
  label: string;
  onClick: () => void;
  prominent?: boolean;
};

export function CreateButton({ label, onClick, prominent = false }: CreateButtonProps) {
  return (
    <Button onClick={onClick} size={prominent ? 'large' : 'medium'} icon={<PlusIcon />}>
      {label}
    </Button>
  );
}
