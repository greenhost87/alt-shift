import { expect, test } from '@playwright/test';
import { gotoDashboard, seedApplications } from '../support/applications';

test('application counter keeps a padded control with an expanded target', async ({ page }) => {
  await seedApplications(page, 1);
  await gotoDashboard(page);

  const counter = page.getByRole('link', { name: '1/5 applications generated' });
  await expect(counter).toBeVisible();

  await expect(counter).toHaveCSS('padding-left', '12px');
  await expect(counter).toHaveCSS('padding-right', '12px');
  const box = await counter.boundingBox();
  expect(box?.height).toBe(24);

  const restingBackground = await counter.evaluate((element) => {
    return window.getComputedStyle(element).backgroundColor;
  });
  await counter.hover();
  const hoveredBackground = await counter.evaluate((element) => {
    return window.getComputedStyle(element).backgroundColor;
  });
  expect(hoveredBackground).not.toBe(restingBackground);

  const hitEdges = await counter.evaluate((element) => {
    const rect = element.getBoundingClientRect();
    const middleX = rect.x + rect.width / 2;
    return {
      above: document.elementFromPoint(middleX, rect.y - 7) === element,
      below: document.elementFromPoint(middleX, rect.y + rect.height + 7) === element,
    };
  });
  expect(hitEdges).toEqual({ above: true, below: true });
});
