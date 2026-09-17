import type { Database } from 'bun:sqlite';
import { getApplicationConfig } from '../config/application';
import { getDatabase } from '../database/connection';
import {
  releaseApplicationGenerationSlot,
  takeApplicationGenerationSlot,
} from '../database/generation/application-limit.dao';

export function createApplicationGenerationLimiter(
  now: () => number = Date.now,
  applicationLimit = getApplicationConfig().applicationLimit,
  database: () => Database = getDatabase,
) {
  return (sessionId: string) => {
    const activeDatabase = database();
    const slotId = takeApplicationGenerationSlot({
      database: activeDatabase,
      sessionId,
      currentTime: now(),
      applicationLimit,
    });
    if (slotId === undefined) return undefined;
    return {
      release() {
        releaseApplicationGenerationSlot(activeDatabase, slotId);
      },
    };
  };
}
