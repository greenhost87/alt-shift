import type { Page } from '@playwright/test';
import { APPLICATION_STORAGE_KEY } from './applications';

export async function rejectApplicationStorageWrites(page: Page) {
  await page.addInitScript((storageKey) => {
    const nativeSetItem = Storage.prototype.setItem.bind(localStorage);
    Storage.prototype.setItem = function (key, value) {
      if (key === storageKey && this.getItem(key) !== null) {
        throw new DOMException('Storage quota exceeded', 'QuotaExceededError');
      }
      nativeSetItem(key, value);
    };
  }, APPLICATION_STORAGE_KEY);
}
