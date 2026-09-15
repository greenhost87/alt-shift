import handler from '@tanstack/react-start/server-entry';
import { paraglideMiddleware } from './paraglide/server.js';

export default {
  async fetch(request: Request): Promise<Response> {
    return paraglideMiddleware(request, async () => handler.fetch(request));
  },
};
