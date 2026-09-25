import { createCsrfMiddleware, createMiddleware, createStart } from '@tanstack/react-start';

const cacheControlMiddleware = createMiddleware().server(async ({ next }) => {
  const result = await next();
  if (result.response.headers.has('Cache-Control')) return result;

  const response = new Response(result.response.body, result.response);
  response.headers.set('Cache-Control', 'no-cache');
  return { ...result, response };
});

const csrfMiddleware = createCsrfMiddleware({
  filter: ({ handlerType }) => handlerType === 'serverFn',
});

export const startInstance = createStart(() => ({
  requestMiddleware: [csrfMiddleware, cacheControlMiddleware],
}));
