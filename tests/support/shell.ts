import { expect } from '@playwright/test';
import type { Page } from '@playwright/test';

export async function expectBrandFocusStyle(page: Page) {
  const brand = page.getByRole('link', { name: 'Alt+Shift' });
  await brand.focus();
  await expect(brand).toBeFocused();
  await expect(brand).toHaveCSS('outline-color', 'rgb(211, 248, 223)');
  await expect(brand).toHaveCSS('outline-style', 'solid');
}
