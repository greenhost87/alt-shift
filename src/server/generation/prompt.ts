import type { GenerationRequest } from '../../system/generation/schema';

function getResponseLanguage(input: GenerationRequest) {
  return input.locale === 'ru' ? 'Russian' : 'English';
}

export function buildGenerationPrompt(input: GenerationRequest) {
  return `Write the response in ${getResponseLanguage(input)}.

<untrusted_applicant_input>
Job title: ${input.jobTitle}
Company: ${input.company}
Strengths: ${input.strengths}
Additional details: ${input.details}
</untrusted_applicant_input>`;
}
