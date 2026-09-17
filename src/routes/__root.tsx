import type { ReactNode } from 'react';
import { HeadContent, Outlet, Scripts, createRootRoute } from '@tanstack/react-router';
import { createServerFn } from '@tanstack/react-start';
import { getCookie } from '@tanstack/react-start/server';
import { Reshaped } from 'reshaped';
import { NotFound } from '../components/layout/not-found/NotFound';
import { getLocale } from '../paraglide/runtime.js';
import { getApplicationConfig } from '../server/config/application';
import {
  APPLICATION_COUNT_COOKIE_NAME,
  parseApplicationCountCookie,
} from '../system/applications/count-cookie';
import { BASE_PATH } from '../system/config/environment';
import { withBasePath } from '../system/config/base-path';
import { ApplicationStateProvider } from '../system/state/application';
import '../styles/global.css';

const loadApplicationConfig = createServerFn({ method: 'GET' }).handler(() => {
  const config = getApplicationConfig();
  const initialApplicationCount = parseApplicationCountCookie(
    getCookie(APPLICATION_COUNT_COOKIE_NAME),
    config.applicationLimit,
  );
  return { config, initialApplicationCount };
});

export const Route = createRootRoute({
  component: RootComponent,
  notFoundComponent: NotFound,
  loader: async () => {
    const config = await loadApplicationConfig();
    return config;
  },
  head: () => ({
    links: [{ href: withBasePath(BASE_PATH, '/favicon.svg'), rel: 'icon', type: 'image/svg+xml' }],
    meta: [
      { charSet: 'utf-8' },
      { content: 'width=device-width, initial-scale=1', name: 'viewport' },
      {
        content: 'Create personalized cover letters in seconds with AI.',
        name: 'description',
      },
      { title: 'Alt+Shift — AI Cover Letter Generator' },
    ],
  }),
});

function RootComponent() {
  const { config, initialApplicationCount } = Route.useLoaderData();
  return (
    <RootDocument>
      <ApplicationStateProvider config={config} initialApplicationCount={initialApplicationCount}>
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
