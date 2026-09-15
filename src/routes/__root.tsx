import type { ReactNode } from 'react';
import { HeadContent, Outlet, Scripts, createRootRoute } from '@tanstack/react-router';
import { Reshaped } from 'reshaped';
import '../styles/global.css';

export const Route = createRootRoute({
  component: RootComponent,
  head: () => ({
    meta: [
      { charSet: 'utf-8' },
      { content: 'width=device-width, initial-scale=1', name: 'viewport' },
      { title: 'Alt+Shift' },
    ],
  }),
});

function RootComponent() {
  return (
    <RootDocument>
      <Reshaped colorMode="light" theme="variant">
        <Outlet />
      </Reshaped>
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
