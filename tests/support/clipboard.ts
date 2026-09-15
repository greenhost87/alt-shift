import type { Page } from '@playwright/test';

export async function rejectClipboardWrites(page: Page, rejectionCount?: number) {
  await page.addInitScript(
    ({ failures }) => {
      let attempts = 0;
      Object.defineProperty(navigator, 'clipboard', {
        configurable: true,
        value: {
          async writeText() {
            attempts += 1;
            if (failures === undefined || attempts <= failures) {
              await Promise.reject(new DOMException('Clipboard denied', 'NotAllowedError'));
            }
          },
        },
      });
      Object.defineProperty(Document.prototype, 'execCommand', {
        configurable: true,
        value(command: string) {
          return command !== 'copy' || (failures !== undefined && attempts > failures);
        },
      });
    },
    { failures: rejectionCount },
  );
}
