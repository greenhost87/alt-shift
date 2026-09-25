import type { ReactNode } from 'react';
import { Text } from 'reshaped';
import { Heading } from './Heading';
import styles from './Message.module.css';

type MessageProps = {
  title: string;
  description: string;
  descriptionId?: string;
  level: 'h1' | 'h2';
  children: ReactNode;
};

export function Message({ title, description, descriptionId, level, children }: MessageProps) {
  const heading =
    level === 'h1' ? (
      <Heading kind="messagePage">{title}</Heading>
    ) : (
      <Heading kind="messageDialog">{title}</Heading>
    );
  return (
    <div className={styles['message']}>
      {heading}
      <Text attributes={{ id: descriptionId }}>{description}</Text>
      {children}
    </div>
  );
}
