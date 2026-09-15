import type { ReactNode } from 'react';
import { Text, View } from 'reshaped';
import { Heading } from './Heading';

type MessageProps = {
  title: string;
  description: string;
  descriptionId?: string;
  level: 'h1' | 'h2';
  children: ReactNode;
};

export function Message({ title, description, descriptionId, level, children }: MessageProps) {
  return (
    <View gap={4}>
      <Heading kind="message" level={level}>{title}</Heading>
      <Text attributes={{ id: descriptionId }}>{description}</Text>
      {children}
    </View>
  );
}
