import { getRequiredEnv } from '../config/environment';

export const GENERATION_API_URL = 'https://test-assignment-api.variant.net/v1/generate';

export function getGenerationApiToken() {
  return getRequiredEnv('GENERATION_API_TOKEN');
}
