import * as v from 'valibot';

export const applicationSchema = v.strictObject({
  id: v.pipe(v.string(), v.uuid()),
  company: v.pipe(v.string(), v.trim(), v.nonEmpty()),
  role: v.pipe(v.string(), v.trim(), v.nonEmpty()),
  letter: v.pipe(v.string(), v.trim(), v.nonEmpty()),
  createdAt: v.pipe(v.string(), v.isoTimestamp()),
});

export type StoredApplication = v.InferOutput<typeof applicationSchema>;
