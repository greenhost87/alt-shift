import { CopyIcon } from '../icon/Icon';
import { Button } from './Button';

type CopyButtonProps = {
  onClick: () => void;
};

export function CopyButton({ onClick }: CopyButtonProps) {
  return (
    <Button onClick={onClick} variant="ghost" icon={<CopyIcon />} iconPosition="end">
      Copy to clipboard
    </Button>
  );
}
