import * as v from 'valibot';
import type { ApplicationStorageConfig } from '../config/application.types';
import { applicationSchema } from './schema';
import type { StoredApplication } from './schema';

function createStoredApplicationsSchema(version: number) {
  return v.strictObject({
    version: v.literal(version),
    applications: v.array(applicationSchema),
  });
}

export type NewStoredApplication = {
  company: string;
  role: string;
  strengths: string;
  details: string;
  letter: string;
};

export type ApplicationsState = {
  applications: StoredApplication[];
  status: 'loading' | 'ready' | 'invalid' | 'unavailable';
};

function sortNewestFirst(applications: StoredApplication[]) {
  return [...applications].sort((first, second) => second.createdAt.localeCompare(first.createdAt));
}

function serializeApplications(
  applications: StoredApplication[],
  config: ApplicationStorageConfig,
) {
  const storedApplications = {
    version: config.version,
    applications: sortNewestFirst(applications),
  };

  return v.parse(
    v.pipe(createStoredApplicationsSchema(config.version), v.stringifyJson()),
    storedApplications,
  );
}

export function readApplications(config: ApplicationStorageConfig): ApplicationsState {
  try {
    const serialized = window.localStorage.getItem(config.key);
    if (serialized === null) {
      window.localStorage.setItem(
        config.key,
        serializeApplications(config.initialApplications, config),
      );
      return { applications: config.initialApplications, status: 'ready' };
    }

    const result = v.safeParse(
      v.pipe(v.string(), v.parseJson(), createStoredApplicationsSchema(config.version)),
      serialized,
    );
    if (!result.success) {
      return { applications: [], status: 'invalid' };
    }

    return { applications: sortNewestFirst(result.output.applications), status: 'ready' };
  } catch {
    return { applications: config.initialApplications, status: 'unavailable' };
  }
}

function notifySameTab(config: ApplicationStorageConfig) {
  window.dispatchEvent(new Event(config.changeEvent));
}

function storeApplications(
  applications: StoredApplication[],
  fallbackApplications: StoredApplication[],
  config: ApplicationStorageConfig,
): ApplicationsState {
  try {
    window.localStorage.setItem(config.key, serializeApplications(applications, config));
    notifySameTab(config);
    return { applications, status: 'ready' };
  } catch {
    return { applications: fallbackApplications, status: 'unavailable' };
  }
}

function createApplicationId() {
  if (typeof globalThis.crypto.randomUUID === 'function') {
    return globalThis.crypto.randomUUID();
  }

  const bytes = globalThis.crypto.getRandomValues(new Uint8Array(16));
  bytes[6] = 64 + ((bytes[6] ?? 0) % 16);
  bytes[8] = 128 + ((bytes[8] ?? 0) % 64);
  const hex = Array.from(bytes, (byte) => byte.toString(16).padStart(2, '0')).join('');
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}

export function addApplication(
  input: NewStoredApplication,
  config: ApplicationStorageConfig,
): ApplicationsState {
  const parsed = v.safeParse(applicationSchema, {
    ...input,
    id: createApplicationId(),
    createdAt: new Date().toISOString(),
  });
  if (!parsed.success) {
    return readApplications(config);
  }

  const current = readApplications(config);
  if (current.status !== 'ready') {
    return current;
  }

  const applications = sortNewestFirst([parsed.output, ...current.applications]);
  return storeApplications(applications, current.applications, config);
}

export function deleteApplication(id: string, config: ApplicationStorageConfig): ApplicationsState {
  const current = readApplications(config);
  if (current.status !== 'ready') {
    return current;
  }

  const applications = current.applications.filter((application) => application.id !== id);
  return storeApplications(applications, current.applications, config);
}
