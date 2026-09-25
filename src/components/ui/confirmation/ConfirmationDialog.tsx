import { useEffect, useId, useState } from 'react';
import { Modal } from 'reshaped';
import * as m from '../../../paraglide/messages.js';
import { Button } from '../button/Button';
import { Message } from '../message/Message';
import styles from './ConfirmationDialog.module.css';

type ConfirmationDialogProps = {
  active: boolean;
  title: string;
  description: string;
  onCancel: () => void;
  onConfirm: () => void;
};

export function ConfirmationDialog({
  active,
  title,
  description,
  onCancel,
  onConfirm,
}: ConfirmationDialogProps) {
  const descriptionId = useId();
  // The overlay wedges open when it is asked to close before its enter
  // transition finishes, so every hide waits for the Modal's own after-open
  // signal. With reduced motion there is no transition (and no signal), so
  // the close applies immediately there instead of waiting.
  const [open, setOpen] = useState(active);
  const [shown, setShown] = useState(false);

  useEffect(() => {
    if (active) {
      setOpen(true);
      return undefined;
    }
    if (shown || window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      setOpen(false);
    }
    return undefined;
  }, [active, shown]);

  return (
    <Modal
      ariaLabel={title}
      attributes={{ 'aria-describedby': descriptionId }}
      active={open}
      className={styles['dialog']}
      onAfterClose={() => {
        setShown(false);
      }}
      onAfterOpen={() => {
        setShown(true);
      }}
      onClose={onCancel}
    >
      <Message title={title} description={description} descriptionId={descriptionId} level="h2">
        <div className={styles['actions']}>
          <Button variant="secondary" onClick={onCancel}>
            {m.cancel()}
          </Button>
          <Button variant="destructive" onClick={onConfirm}>
            {m.confirm_deletion()}
          </Button>
        </div>
      </Message>
    </Modal>
  );
}
