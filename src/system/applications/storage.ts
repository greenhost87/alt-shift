import { useCallback, useEffect, useState } from 'react';
import * as v from 'valibot';

const STORAGE_KEY = 'variant-cover-letters:v1';
const STORAGE_VERSION = 1;
const STORAGE_CHANGE_EVENT = 'variant-cover-letters:change';

const applicationSchema = v.strictObject({
  id: v.pipe(v.string(), v.uuid()),
  company: v.pipe(v.string(), v.trim(), v.nonEmpty()),
  role: v.pipe(v.string(), v.trim(), v.nonEmpty()),
  letter: v.pipe(v.string(), v.trim(), v.nonEmpty()),
  createdAt: v.pipe(v.string(), v.isoTimestamp()),
});

const storedApplicationsSchema = v.strictObject({
  version: v.literal(STORAGE_VERSION),
  applications: v.array(applicationSchema),
});

const serializedApplicationsSchema = v.pipe(v.string(), v.parseJson(), storedApplicationsSchema);

export type StoredApplication = v.InferOutput<typeof applicationSchema>;

type StoredApplications = v.InferOutput<typeof storedApplicationsSchema>;

export type NewStoredApplication = Pick<StoredApplication, 'company' | 'role' | 'letter'>;

type ApplicationsState = {
  applications: StoredApplication[];
  status: 'loading' | 'ready' | 'invalid' | 'unavailable';
};

type StoredApplicationsApi = {
  applications: StoredApplication[];
  status: 'loading' | 'ready' | 'invalid' | 'unavailable';
  addApplication: (application: NewStoredApplication) => boolean;
  deleteApplication: (id: string) => void;
};

const APPLICATION_LETTER = `Dear Stripe team,
I am a highly skilled product designer with a passion for creating intuitive, user-centered designs. I have a strong background in design systems and am excited about the opportunity to join the Stripe product design team and work on building out the design system for the platform.
I am particularly drawn to Stripe's mission of making it easy for businesses to sell online and am confident that my experience in creating user-friendly designs will be an asset to the team. I have experience in conducting user research, creating wireframes, and prototyping interactive designs, as well as working closely with engineers to ensure that my designs are implemented correctly.
I am a strong collaborator and have experience working in cross-functional teams to bring new products and features to market. I'm confident that I can help improve Stripe's user experience and make it even more accessible to businesses.
I would love the opportunity to speak with you further about my qualifications and how I can contribute to the Stripe team. Thank you for considering my application.`;

const INITIAL_APPLICATIONS: StoredApplication[] = [
  {
    id: '00000000-0000-4000-8000-000000000003',
    company: 'Stripe',
    role: 'Product Designer',
    letter: APPLICATION_LETTER,
    createdAt: '2026-01-03T00:00:00.000Z',
  },
  {
    id: '00000000-0000-4000-8000-000000000002',
    company: 'Stripe',
    role: 'Product Designer',
    letter: APPLICATION_LETTER,
    createdAt: '2026-01-02T00:00:00.000Z',
  },
  {
    id: '00000000-0000-4000-8000-000000000001',
    company: 'Stripe',
    role: 'Product Designer',
    letter: APPLICATION_LETTER,
    createdAt: '2026-01-01T00:00:00.000Z',
  },
];

const LOADING_STATE: ApplicationsState = { applications: [], status: 'loading' };

function sortNewestFirst(applications: StoredApplication[]) {
  return [...applications].sort((first, second) => second.createdAt.localeCompare(first.createdAt));
}

function serializeApplications(applications: StoredApplication[]) {
  const storedApplications: StoredApplications = {
    version: STORAGE_VERSION,
    applications: sortNewestFirst(applications),
  };

  return v.parse(v.pipe(storedApplicationsSchema, v.stringifyJson()), storedApplications);
}

function readApplications(): ApplicationsState {
  try {
    const serialized = window.localStorage.getItem(STORAGE_KEY);
    if (serialized === null) {
      window.localStorage.setItem(STORAGE_KEY, serializeApplications(INITIAL_APPLICATIONS));
      return { applications: INITIAL_APPLICATIONS, status: 'ready' };
    }

    const result = v.safeParse(serializedApplicationsSchema, serialized);
    if (!result.success) {
      return { applications: [], status: 'invalid' };
    }

    return { applications: sortNewestFirst(result.output.applications), status: 'ready' };
  } catch {
    return { applications: INITIAL_APPLICATIONS, status: 'unavailable' };
  }
}

function notifySameTab() {
  window.dispatchEvent(new Event(STORAGE_CHANGE_EVENT));
}

function addApplication(input: NewStoredApplication): ApplicationsState {
  const parsed = v.safeParse(
    applicationSchema,
    {
      ...input,
      id: crypto.randomUUID(),
      createdAt: new Date().toISOString(),
    },
  );
  if (!parsed.success) {
    return readApplications();
  }

  const current = readApplications();
  if (current.status !== 'ready') {
    return current;
  }

  const applications = sortNewestFirst([parsed.output, ...current.applications]);
  try {
    window.localStorage.setItem(STORAGE_KEY, serializeApplications(applications));
    notifySameTab();
    return { applications, status: 'ready' };
  } catch {
    return { applications: current.applications, status: 'unavailable' };
  }
}

function deleteApplication(id: string): ApplicationsState {
  const current = readApplications();
  if (current.status !== 'ready') {
    return current;
  }

  const applications = current.applications.filter((application) => application.id !== id);
  try {
    window.localStorage.setItem(STORAGE_KEY, serializeApplications(applications));
    notifySameTab();
    return { applications, status: 'ready' };
  } catch {
    return { applications: current.applications, status: 'unavailable' };
  }
}

export function useStoredApplications(): StoredApplicationsApi {
  const [state, setState] = useState<ApplicationsState>(LOADING_STATE);

  useEffect(() => {
    const refresh = () => {
      setState(readApplications());
    };
    const refreshFromStorage = (event: StorageEvent) => {
      if (event.key === STORAGE_KEY || event.key === null) {
        refresh();
      }
    };

    refresh();
    window.addEventListener('storage', refreshFromStorage);
    window.addEventListener(STORAGE_CHANGE_EVENT, refresh);
    return () => {
      window.removeEventListener('storage', refreshFromStorage);
      window.removeEventListener(STORAGE_CHANGE_EVENT, refresh);
    };
  }, []);

  const add = useCallback((application: NewStoredApplication) => {
    if (
      ![application.company, application.role, application.letter].every((value) => value.trim())
    ) {
      return false;
    }
    const nextState = addApplication(application);
    setState(nextState);
    return nextState.status === 'ready';
  }, []);

  const remove = useCallback((id: string) => {
    setState(deleteApplication(id));
  }, []);

  return { ...state, addApplication: add, deleteApplication: remove };
}
