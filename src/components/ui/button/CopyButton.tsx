import { useEffect, useState } from 'react';
import { CopyIcon } from '../icon/Icon';
import { Button } from './Button';

type CopyButtonProps = {
  onClick: () => Promise<boolean>;
};

export function CopyButton({ onClick }: CopyButtonProps) {
  const [copied, setCopied] = useState(false);
  useEffect(() => {
    if (!copied) return undefined;
    const timeout = window.setTimeout(() => {
      setCopied(false);
    }, 2000);
    return () => {
      window.clearTimeout(timeout);
    };
  }, [copied]);

  const copy = async () => {
    setCopied(false);
    setCopied(await onClick());
  };

  return (
    <Button
      ariaLabel={copied ? 'Copied!' : 'Copy to clipboard'}
      onClick={() => void copy()}
      variant="ghost"
      icon={<CopyIcon />}
      iconPosition="end"
    >
      <output aria-live="polite">
        {copied ? 'Copied!' : 'Copy to clipboard'}
      </output>
    </Button>
  );
}
