import { Button } from '../../ui/button/Button';
import { HomeIcon } from '../../ui/icon/Icon';

type HomeButtonProps = {
  onClick: () => void;
};

export function HomeButton({ onClick }: HomeButtonProps) {
  return (
    <Button
      ariaLabel="Home"
      icon={<HomeIcon />}
      onClick={onClick}
      size="icon"
      type="button"
      variant="secondary"
    />
  );
}
