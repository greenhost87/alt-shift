import * as v from 'valibot';

export const generationRequestSchema = v.strictObject({
  jobTitle: v.pipe(v.string(), v.trim(), v.nonEmpty(), v.maxLength(200)),
  company: v.pipe(v.string(), v.trim(), v.nonEmpty(), v.maxLength(200)),
  strengths: v.pipe(v.string(), v.trim(), v.nonEmpty(), v.maxLength(2_000)),
  details: v.pipe(v.string(), v.trim(), v.nonEmpty(), v.maxLength(1_200)),
});

export type GenerationRequest = v.InferOutput<typeof generationRequestSchema>;

type GenerationRequestInput = {
  jobTitle: string;
  company: string;
  strengths: string;
  details: string;
};

export function safeParseGenerationRequest(input: GenerationRequestInput) {
  return v.safeParse(generationRequestSchema, input);
}
