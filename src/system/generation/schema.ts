import * as v from 'valibot';
import type { GenerationFieldLimits } from '../config/application.types';

export type GenerationRequest = {
  jobTitle: string;
  company: string;
  strengths: string;
  details: string;
};

export function createGenerationRequestSchema(limits: GenerationFieldLimits) {
  return v.strictObject({
    jobTitle: v.pipe(v.string(), v.trim(), v.nonEmpty(), v.maxLength(limits.jobTitle)),
    company: v.pipe(v.string(), v.trim(), v.nonEmpty(), v.maxLength(limits.company)),
    strengths: v.pipe(v.string(), v.trim(), v.nonEmpty(), v.maxLength(limits.strengths)),
    details: v.pipe(v.string(), v.trim(), v.nonEmpty(), v.maxLength(limits.details)),
  });
}

export function safeParseGenerationRequest(
  input: GenerationRequest,
  limits: GenerationFieldLimits,
) {
  return v.safeParse(createGenerationRequestSchema(limits), input);
}
