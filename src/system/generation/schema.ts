import * as v from 'valibot';
import { locales } from '../../paraglide/runtime.js';
import type { Locale } from '../../paraglide/runtime.js';
import type { GenerationFieldLimits } from '../config/application.types';

export type GenerationRequest = {
  jobTitle: string;
  company: string;
  strengths: string;
  details: string;
  locale: Locale;
};

export function createGenerationRequestSchema(limits: GenerationFieldLimits) {
  return v.strictObject({
    jobTitle: v.pipe(v.string(), v.trim(), v.nonEmpty(), v.maxLength(limits.jobTitle)),
    company: v.pipe(v.string(), v.trim(), v.nonEmpty(), v.maxLength(limits.company)),
    strengths: v.pipe(v.string(), v.trim(), v.nonEmpty(), v.maxLength(limits.strengths)),
    details: v.pipe(v.string(), v.trim(), v.nonEmpty(), v.maxLength(limits.details)),
    locale: v.picklist(locales),
  });
}

export function safeParseGenerationRequest(
  input: GenerationRequest,
  limits: GenerationFieldLimits,
) {
  return v.safeParse(createGenerationRequestSchema(limits), input);
}
