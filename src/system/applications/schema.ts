import * as v from 'valibot';

export const applicationSchema = v.strictObject({
  id: v.pipe(v.string(), v.uuid()),
  company: v.pipe(v.string(), v.trim(), v.nonEmpty()),
  role: v.pipe(v.string(), v.trim(), v.nonEmpty()),
  strengths: v.optional(v.string(), ''),
  details: v.optional(v.string(), ''),
  letter: v.pipe(v.string(), v.trim(), v.nonEmpty()),
  createdAt: v.pipe(v.string(), v.isoTimestamp()),
});

export type StoredApplication = v.InferOutput<typeof applicationSchema>;

export type NewStoredApplication = {
  company: string;
  role: string;
  strengths: string;
  details: string;
  letter: string;
};
