import type { ReactNode } from 'react';
import { HeadContent, Outlet, Scripts, createRootRoute } from '@tanstack/react-router';
import { createServerFn } from '@tanstack/react-start';
import { Reshaped } from 'reshaped';
import { getApplicationConfig } from '../server/config/application';
import { ApplicationConfigProvider } from '../system/config/application';
import '../styles/global.css';

const loadApplicationConfig = createServerFn({ method: 'GET' }).handler(() =>
  getApplicationConfig(),
);

export const Route = createRootRoute({
  component: RootComponent,
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
      <ApplicationConfigProvider value={config}>
        <Reshaped colorMode="light" theme="variant">
          <Outlet />
        </Reshaped>
      </ApplicationConfigProvider>
    </RootDocument>
  );
}

type RootDocumentProps = {
  children: ReactNode;
};

function RootDocument({ children }: RootDocumentProps) {
  return (
    <html data-rs-color-mode="light" data-rs-theme="variant" dir="ltr" lang="en">
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
