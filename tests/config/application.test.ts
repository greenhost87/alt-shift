import { afterEach, describe, expect, test } from 'bun:test';
import {
  getApplicationConfig,
  getGenerationSystemPrompt,
} from '../../src/server/config/application';
import { getOptionalEnv, setEnv } from '../../src/server/config/environment';

const CONFIG_KEYS = [
  'APPLICATION_LIMIT',
  'APPLICATION_INITIAL_FORM_JSON',
  'APPLICATION_INITIAL_APPLICATIONS_JSON',
  'APPLICATION_STORAGE_KEY',
  'APPLICATION_STORAGE_VERSION',
  'APPLICATION_STORAGE_CHANGE_EVENT',
  'GENERATION_JOB_TITLE_MAX_LENGTH',
  'GENERATION_COMPANY_MAX_LENGTH',
  'GENERATION_STRENGTHS_MAX_LENGTH',
  'GENERATION_DETAILS_MAX_LENGTH',
  'GENERATION_SYSTEM_PROMPT',
] as const;

const originalValues = new Map(CONFIG_KEYS.map((key) => [key, getOptionalEnv(key)]));

afterEach(() => {
  for (const key of CONFIG_KEYS) setEnv(key, originalValues.get(key));
});

describe('application environment configuration', () => {
  test('starts with an empty form and application list', () => {
    setEnv('APPLICATION_INITIAL_FORM_JSON', undefined);
    setEnv('APPLICATION_INITIAL_APPLICATIONS_JSON', undefined);

    const config = getApplicationConfig();

    expect(config.initialForm).toEqual({ jobTitle: '', company: '', strengths: '', details: '' });
    expect(config.storage.initialApplications).toEqual([]);
  });

  test('loads product, field, content, and storage settings', () => {
    setEnv('APPLICATION_LIMIT', '7');
    setEnv(
      'APPLICATION_INITIAL_FORM_JSON',
      '{"jobTitle":"Engineer","company":"Variant","strengths":"TypeScript","details":"Delivery"}',
    );
    setEnv(
      'APPLICATION_INITIAL_APPLICATIONS_JSON',
      '[{"id":"00000000-0000-4000-8000-000000000009","company":"Variant","role":"Engineer","letter":"Hello","createdAt":"2026-02-01T00:00:00.000Z"}]',
    );
    setEnv('APPLICATION_STORAGE_KEY', 'custom-applications:v2');
    setEnv('APPLICATION_STORAGE_VERSION', '2');
    setEnv('APPLICATION_STORAGE_CHANGE_EVENT', 'custom-applications:change');
    setEnv('GENERATION_JOB_TITLE_MAX_LENGTH', '101');
    setEnv('GENERATION_COMPANY_MAX_LENGTH', '102');
    setEnv('GENERATION_STRENGTHS_MAX_LENGTH', '103');
    setEnv('GENERATION_DETAILS_MAX_LENGTH', '104');
    setEnv('GENERATION_SYSTEM_PROMPT', 'Custom system prompt');

    expect(getApplicationConfig()).toEqual({
      applicationLimit: 7,
      fieldLimits: { jobTitle: 101, company: 102, strengths: 103, details: 104 },
      initialForm: {
        jobTitle: 'Engineer',
        company: 'Variant',
        strengths: 'TypeScript',
        details: 'Delivery',
      },
      storage: {
        key: 'custom-applications:v2',
        version: 2,
        changeEvent: 'custom-applications:change',
        initialApplications: [
          {
            id: '00000000-0000-4000-8000-000000000009',
            company: 'Variant',
            role: 'Engineer',
            strengths: '',
            details: '',
            letter: 'Hello',
            createdAt: '2026-02-01T00:00:00.000Z',
          },
        ],
      },
    });
    expect(getGenerationSystemPrompt()).toBe('Custom system prompt');
  });
});
