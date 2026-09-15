import type { GenerationRequest } from '../../system/generation/schema';

export function buildGenerationPrompt(input: GenerationRequest) {
  return `<untrusted_applicant_input>
Job title: ${input.jobTitle}
Company: ${input.company}
Strengths: ${input.strengths}
Additional details: ${input.details}
</untrusted_applicant_input>`;
}
