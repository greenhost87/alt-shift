import { Link } from '@tanstack/react-router';
import { View } from 'reshaped';
import { Message } from '../../ui/message/Message';

export function NotFound() {
  return (
    <View as="main" padding={8} gap={4} align="center">
      <Message title="Page not found" description="The page you are looking for does not exist." level="h1">
        <Link to="/">Back to applications</Link>
      </Message>
    </View>
  );
}
