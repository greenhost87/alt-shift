import { expect } from '@playwright/test';
import type { Locator, Page } from '@playwright/test';

export const RESPONSIVE_WIDTHS = [320, 375, 480, 767, 768, 899, 900, 1024, 1440] as const;

export async function expectPageWidth(page: Page, width: number) {
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBe(width);
}

export async function openResponsivePage(page: Page, width: number, path: string) {
  await page.setViewportSize({ height: 900, width });
  await page.goto(path, { waitUntil: 'domcontentloaded' });
}

export async function expectContentFitsViewport(page: Page) {
  const viewportWidth = await page.evaluate(() => window.innerWidth);
  const contentWidth = await page.evaluate(() => document.documentElement.scrollWidth);
  if (contentWidth > viewportWidth) {
    const overflowingElements = await page
      .locator('body *')
      .evaluateAll(
        (elements, width) =>
          elements
            .filter((element) => element.getBoundingClientRect().right > width)
            .map(
              (element) =>
                `${element.tagName}.${element.getAttribute('class') ?? ''}: ${element.textContent.trim()}`,
            ),
        viewportWidth,
      );
    expect(contentWidth, `Overflowing elements: ${overflowingElements.join(' | ')}`).toBe(
      viewportWidth,
    );
  }

  const actions = page.getByRole('button');
  const actionCount = await actions.count();
  for (let index = 0; index < actionCount; index += 1) {
    const box = await actions.nth(index).boundingBox();
    expect(box?.x).toBeGreaterThanOrEqual(0);
    expect(box?.height).toBeGreaterThanOrEqual(44);
    expect(box?.width).toBeGreaterThanOrEqual(44);
    expect((box?.x ?? viewportWidth) + (box?.width ?? 1)).toBeLessThanOrEqual(viewportWidth);
  }
}

export async function expectDialogFitsViewport(
  page: Page,
  modal: Locator,
  close: Locator,
  title: Locator,
) {
  const viewport = page.viewportSize();
  if (viewport === null) throw new Error('Expected a configured viewport.');
  const modalBox = await modal.boundingBox();
  const closeBox = await close.boundingBox();
  const titleBox = await title.boundingBox();

  expect(modalBox?.x).toBeGreaterThanOrEqual(0);
  expect((modalBox?.x ?? viewport.width) + (modalBox?.width ?? 1)).toBeLessThanOrEqual(
    viewport.width,
  );
  expect(modalBox?.y).toBeGreaterThanOrEqual(0);
  expect((modalBox?.y ?? viewport.height) + (modalBox?.height ?? 1)).toBeLessThanOrEqual(
    viewport.height,
  );
  expect(titleBox?.y).toBeGreaterThanOrEqual((closeBox?.y ?? 0) + (closeBox?.height ?? 0));
  await expectContentFitsViewport(page);
}
