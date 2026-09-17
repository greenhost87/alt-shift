import { useEffect, useState } from 'react';
import * as m from '../../../paraglide/messages.js';
import { CopyIcon } from '../icon/Icon';
import { Button } from './Button';

type CopyButtonProps = {
  feedbackTimeoutMs: number;
  onClick: () => Promise<boolean>;
};

export function CopyButton({ feedbackTimeoutMs, onClick }: CopyButtonProps) {
  const [copied, setCopied] = useState(false);
  const [pending, setPending] = useState(false);
  useEffect(() => {
    if (!copied) return undefined;
    const timeout = window.setTimeout(() => {
      setCopied(false);
    }, feedbackTimeoutMs);
    return () => {
      window.clearTimeout(timeout);
    };
  }, [copied, feedbackTimeoutMs]);

  const copy = async () => {
    if (pending) return;
    setPending(true);
    setCopied(false);
    try {
      setCopied(await onClick());
    } finally {
      setPending(false);
    }
  };

  const label = copied ? m.copied() : m.copy_to_clipboard();
  return (
    <Button
      ariaLabel={label}
      disabled={pending}
      endIcon={<CopyIcon />}
      onClick={() => void copy()}
      variant="ghost"
    >
      <output aria-live="polite">{label}</output>
    </Button>
  );
}
