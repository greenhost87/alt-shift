import type { ReactNode } from 'react';
import { HeadContent, Outlet, Scripts, createRootRoute } from '@tanstack/react-router';
import { createServerFn } from '@tanstack/react-start';
import { Reshaped } from 'reshaped';
import { NotFound } from '../components/layout/not-found/NotFound';
import { getLocale } from '../paraglide/runtime.js';
import { getApplicationConfig } from '../server/config/application';
import { ApplicationStateProvider } from '../system/state/application';
import '../styles/global.css';

const loadApplicationConfig = createServerFn({ method: 'GET' }).handler(() =>
  getApplicationConfig(),
);

export const Route = createRootRoute({
  component: RootComponent,
  notFoundComponent: NotFound,
  loader: async () => {
    const config = await loadApplicationConfig();
    return config;
  },
  head: () => ({
    meta: [
      { charSet: 'utf-8' },
      { content: 'width=device-width, initial-scale=1', name: 'viewport' },
      { title: 'Alt+Shift' },
    ],
  }),
});

function RootComponent() {
  const config = Route.useLoaderData();
  return (
    <RootDocument>
      <ApplicationStateProvider config={config}>
        <Reshaped colorMode="light" theme="variant">
          <Outlet />
        </Reshaped>
      </ApplicationStateProvider>
    </RootDocument>
  );
}

type RootDocumentProps = {
  children: ReactNode;
};

function RootDocument({ children }: RootDocumentProps) {
  return (
    <html data-rs-color-mode="light" data-rs-theme="variant" dir="ltr" lang={getLocale()}>
      <head>
        <HeadContent />
      </head>
      <body>
        {children}
        <Scripts />
      </body>
    </html>
  );
}
