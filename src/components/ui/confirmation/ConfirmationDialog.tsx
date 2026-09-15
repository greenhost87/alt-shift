import { useEffect, useId, useState } from 'react';
import { Modal, View } from 'reshaped';
import * as m from '../../../paraglide/messages.js';
import { Button } from '../button/Button';
import { Message } from '../message/Message';

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
  const [ready, setReady] = useState(false);
  const descriptionId = useId();

  useEffect(() => {
    if (!active) {
      setReady(false);
      return undefined;
    }

    const transitionsDisabled =
      document.documentElement.hasAttribute('data-rs-no-transition') ||
      window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (!transitionsDisabled) return undefined;

    let secondFrame: number | undefined;
    let thirdFrame: number | undefined;
    const firstFrame = requestAnimationFrame(() => {
      secondFrame = requestAnimationFrame(() => {
        thirdFrame = requestAnimationFrame(() => {
          setReady(true);
        });
      });
    });

    return () => {
      cancelAnimationFrame(firstFrame);
      if (secondFrame !== undefined) cancelAnimationFrame(secondFrame);
      if (thirdFrame !== undefined) cancelAnimationFrame(thirdFrame);
    };
  }, [active]);

  return (
    <Modal
      ariaLabel={title}
      attributes={{ 'aria-describedby': descriptionId }}
      active={active}
      onClose={onCancel}
      onAfterOpen={() => {
        setReady(true);
      }}
      onAfterClose={() => {
        setReady(false);
      }}
      size="440px"
      padding={6}
    >
      <span data-dialog-ready={ready} hidden />
      <Message title={title} description={description} descriptionId={descriptionId} level="h2">
        <View direction="row" gap={3} justify="end">
          <Button
            ariaDisabled={!ready}
            variant="secondary"
            onClick={() => {
              if (ready) onCancel();
            }}
          >
            {m.cancel()}
          </Button>
          <Button
            ariaDisabled={!ready}
            onClick={() => {
              if (ready) onConfirm();
            }}
          >
            {m.confirm_deletion()}
          </Button>
        </View>
      </Message>
    </Modal>
  );
}
