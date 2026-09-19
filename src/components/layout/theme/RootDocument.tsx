import { HeadContent, Scripts } from '@tanstack/react-router';
import type { ReactNode } from 'react';
import { Reshaped } from 'reshaped';
import { getLocale } from '../../../paraglide/runtime.js';

type RootDocumentProps = {
  children: ReactNode;
};

export function RootDocument({ children }: RootDocumentProps) {
  return (
    <html data-rs-color-mode="light" data-rs-theme="variant" dir="ltr" lang={getLocale()}>
      <head>
        <HeadContent />
      </head>
      <body>
        <Reshaped colorMode="light" theme="variant">
          {children}
        </Reshaped>
        <Scripts />
      </body>
    </html>
  );
}
