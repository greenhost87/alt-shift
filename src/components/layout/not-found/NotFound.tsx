import { Link } from '@tanstack/react-router';
import { View } from 'reshaped';
import * as m from '../../../paraglide/messages.js';
import { Message } from '../../ui/message/Message';

export function NotFound() {
  return (
    <View as="main" padding={8} gap={4} align="center">
      <Message title={m.page_not_found()} description={m.page_not_found_description()} level="h1">
        <Link to="/">{m.back_to_applications()}</Link>
      </Message>
    </View>
  );
}
