import type { Page } from '@playwright/test';
import {
  createApplicationFixtures,
  fillApplicationFields,
  storeApplications,
} from '../support/applications';
import { expect, scenario } from '../support/aqg-scenario.helpers.ts';
import { confirmDeletion, openDeletionDialog } from '../support/dialog';
import {
  installCopyableGenerationResponse,
  installGenerationBrowserFixtures,
} from '../support/generation-browser';

async function installGenerationSupport(page: Page): Promise<void> {
  await installGenerationBrowserFixtures(page);
  await installCopyableGenerationResponse(page);
}

async function expectApplicationForm(page: Page): Promise<void> {
  await expect(page).toHaveURL(/\/applications\/new$/);
}

async function closeSubscriptionModal(page: Page): Promise<void> {
  await page.getByRole('button', { name: 'Subscribe' }).click();
  const modal = page.getByRole('dialog', { name: 'Unlock unlimited applications' });
  await modal.getByRole('button', { name: 'Close' }).click();
}

async function expectSubscriptionModalHidden(page: Page): Promise<void> {
  await expect(page.getByRole('dialog')).toBeHidden();
}

async function openDashboardWithApplication(page: Page): Promise<void> {
  await storeApplications(page, createApplicationFixtures(1), 'init');
  await page.goto('/applications');
}

async function openCopyableDashboard(page: Page): Promise<void> {
  await installCopyableGenerationResponse(page);
  await openDashboardWithApplication(page);
}

async function clickButton(page: Page, name: string): Promise<void> {
  await page.getByRole('button', { name }).click();
}

async function openSavedGenerator(page: Page): Promise<void> {
  await installGenerationSupport(page);
  await storeApplications(page, createApplicationFixtures(1), 'init');
  await page.goto('/applications/00000000-0000-4000-8000-000000000001');
  await expect(page.getByRole('button', { name: 'Try Again' })).toBeVisible();
}

scenario('landing.create-application', async ({ page, given, when, then }) => {
  await given('the landing page is ready', async () => {
    await installGenerationSupport(page);
    await page.goto('/', { waitUntil: 'networkidle' });
  });
  await when(
    {
      description: 'start a new application',
      covers: 'Button.onClick@index.createApplication',
    },
    async () => page.getByRole('button', { name: 'Create my cover letter' }).first().click(),
  );
  await then('the application form opens', async () => expectApplicationForm(page));
});

scenario('generator.generate-application', async ({ page, given, when, then }) => {
  await given('an empty application form', async () => {
    await installGenerationSupport(page);
    await page.goto('/applications/new', { waitUntil: 'networkidle' });
  });
  await when(
    {
      description: 'complete the application form and generate',
      covers: [
        'TextField.onChange@ApplicationGenerator.setJobTitle',
        'TextField.onChange@ApplicationGenerator.setCompany',
        'TextField.onChange@ApplicationGenerator.setStrengths',
        'TextAreaField.onChange@ApplicationGenerator.setDetails',
        'ApplicationForm.onSubmit@ApplicationGenerator.submit',
      ],
    },
    async () => {
      await fillApplicationFields(page);
      await clickButton(page, 'Generate Now');
    },
  );
  await then('the generated application is shown', async () => {
    const retryButton = page.getByRole('button', { name: 'Try Again' });
    await expect(retryButton).toBeVisible();
  });
});

scenario('generator.saved-application-actions', async ({ page, given, when, then }) => {
  await given('a saved application is open', async () => openSavedGenerator(page));
  await when(
    {
      description: 'copy the letter and start another application',
      covers: [
        'Button.onClick@ApplicationGenerator.copyApplication',
        'Button.onClick@ApplicationGenerator.startNewApplication',
      ],
    },
    async () => {
      await clickButton(page, 'Copy to clipboard');
      await page.getByRole('button', { name: 'Try Again' }).click();
    },
  );
  await then('a blank application form is shown', async () => {
    await expectApplicationForm(page);
    await expect(page.getByLabel('Job title')).toHaveValue('');
  });
});

scenario('generator.subscription', async ({ page, given, when, then }) => {
  await given('a generator at the free application limit', async () => {
    await installGenerationSupport(page);
    await storeApplications(page, createApplicationFixtures(5), 'init');
    await page.goto('/applications/new', { waitUntil: 'networkidle' });
  });
  await when(
    {
      description: 'open and close the subscription modal',
      covers: [
        'Button.onClick@ApplicationGenerator.showSubscriptionModal',
        'Button.onClick@ApplicationGenerator.onClose',
      ],
    },
    async () => {
      await closeSubscriptionModal(page);
    },
  );
  await then('the subscription modal is hidden', async () => {
    await expectSubscriptionModalHidden(page);
  });
});

scenario('dashboard.create-application', async ({ page, given, when, then }) => {
  await given('an empty applications dashboard', async () => {
    await page.goto('/applications');
  });
  await when(
    {
      description: 'create the first application',
      covers: 'Button.onClick@applications.index.navigate',
    },
    async () => {
      await page.getByRole('button', { name: 'Create your first application' }).click();
    },
  );
  await then('the application form opens', async () => {
    await expectApplicationForm(page);
  });
});

scenario('dashboard.subscription', async ({ page, given, when, then }) => {
  await given('a dashboard at the free application limit', async () => {
    const applications = createApplicationFixtures(5);
    await storeApplications(page, applications, 'init');
    await page.goto('/applications');
  });
  await when(
    {
      description: 'open and close the subscription modal',
      covers: [
        'Button.onClick@ApplicationsDashboard.onSubscribe',
        'Button.onClick@ApplicationsDashboard.onClose',
      ],
    },
    async () => closeSubscriptionModal(page),
  );
  await then('the subscription modal is hidden', async () => expectSubscriptionModalHidden(page));
});

scenario('dashboard.copy-application', async ({ page, given, when, then }) => {
  await given('a dashboard with one saved application', async () => openCopyableDashboard(page));
  await when(
    {
      description: 'copy the application',
      covers: [
        'Button.onClick@ApplicationsDashboard.copyApplication',
        'Button.onClick@CopyButton.copy',
      ],
    },
    async () => {
      await clickButton(page, 'Copy to clipboard');
    },
  );
  await then('the saved application remains visible', async () => {
    const savedApplication = page.getByText('Cover letter 1');
    await expect(savedApplication).toBeVisible();
  });
});

scenario('dashboard.delete-application', async ({ page, given, when, then }) => {
  await given('a dashboard with one saved application', async () => {
    await openDashboardWithApplication(page);
  });
  await when(
    {
      description: 'request and confirm application deletion',
      covers: [
        'Button.onClick@ApplicationsDashboard.setPendingDeletion',
        'Button.onClick@ApplicationsDashboard.deleteApplication',
      ],
    },
    async () => {
      const dialog = await openDeletionDialog(page);
      await confirmDeletion(dialog);
    },
  );
  await then('the dashboard is empty', async () => {
    await expect(page.getByRole('heading', { name: 'No applications yet' })).toBeVisible();
  });
});

scenario('shell.change-language', async ({ page, given, when, then }) => {
  await given('the applications dashboard is ready', async () => {
    await page.goto('/applications', { waitUntil: 'networkidle' });
  });
  await when(
    {
      description: 'switch the language to Russian',
      covers: 'LanguageSwitcher.onChange@LanguageSwitcher.changeLanguage',
    },
    async () => {
      await page.getByRole('button', { name: 'Language' }).click();
      await page.getByRole('option', { name: '🇷🇺 Русский' }).click();
    },
  );
  await then('the interface uses Russian', async () => {
    await expect(page.locator('html')).toHaveAttribute('lang', 'ru');
  });
});
