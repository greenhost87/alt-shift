import { useId, useState } from 'react';
import { Modal, View } from 'reshaped';
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
      <Message title={title} description={description} descriptionId={descriptionId} level="h2">
        <View direction="row" gap={3} justify="end">
          <Button disabled={!ready} variant="secondary" onClick={onCancel}>
            Cancel
          </Button>
          <Button disabled={!ready} onClick={onConfirm}>
            Confirm deletion
          </Button>
        </View>
      </Message>
    </Modal>
  );
}
