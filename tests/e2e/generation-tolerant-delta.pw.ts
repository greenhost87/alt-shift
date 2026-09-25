import { expect, test } from '@playwright/test';
import generationFixtures from '../fixtures/generation.json' with { type: 'json' };
import { fillApplicationFields, gotoNewApplication } from '../support/applications';
import { installGenerationBrowserFixtures } from '../support/generation-browser';

test('tolerates additional fields in upstream delta events', async ({ page }) => {
  await installGenerationBrowserFixtures(page);
  await page.addInitScript((stream) => {
    window.respondToGeneration = () => window.generationResponse(stream);
  }, generationFixtures.tolerantStream);
  await gotoNewApplication(page);
  await fillApplicationFields(page);
  await page.getByRole('button', { name: 'Generate Now' }).click();

  await expect(page.getByText(generationFixtures.tolerantLetter)).toBeVisible();
  await expect(page.getByText('The generation service returned an invalid event.')).toHaveCount(0);
});
