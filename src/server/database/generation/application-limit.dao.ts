import type { Database } from 'bun:sqlite';

type TakeApplicationGenerationSlotOptions = {
  database: Database;
  sessionId: string;
  currentTime: number;
  applicationLimit: number;
};

type CountRow = {
  count: number;
};

type SlotRow = {
  id: number;
};

export function takeApplicationGenerationSlot(
  options: TakeApplicationGenerationSlotOptions,
): number | undefined {
  return options.database
    .transaction(() => {
      const row = options.database
        .query<CountRow, [string]>(`
          SELECT COUNT(*) AS count
          FROM application_generation_slots
          WHERE session_id = ?
        `)
        .get(options.sessionId);
      if (row === null || row.count >= options.applicationLimit) return undefined;

      const slot = options.database
        .query<SlotRow, [string, number]>(`
          INSERT INTO application_generation_slots (session_id, created_at_ms)
          VALUES (?, ?)
          RETURNING id
        `)
        .get(options.sessionId, options.currentTime);
      return slot?.id;
    })
    .immediate();
}

export function releaseApplicationGenerationSlot(database: Database, slotId: number): void {
  database.run('DELETE FROM application_generation_slots WHERE id = ?', [slotId]);
}
