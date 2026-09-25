import { createStore } from 'zustand/vanilla';
import type { StoreApi } from 'zustand/vanilla';
import type { ApplicationRepository } from '../applications/repository';
import type { NewStoredApplication, StoredApplication } from '../applications/schema';
import { writeApplicationCountCookie } from '../applications/count-cookie';
import type { ApplicationConfig } from '../config/application.types';

const STORAGE_STATUSES = ['loading', 'ready', 'invalid', 'unavailable'] as const;

export type StorageStatus = (typeof STORAGE_STATUSES)[number];

export type PersistenceState = {
  applications: StoredApplication[];
  initialApplicationCount: number;
  storageStatus: StorageStatus;
  serverApplicationLimitReached: boolean;
  refreshApplications: () => void;
  addApplication: (application: NewStoredApplication) => boolean;
  deleteApplication: (id: string) => void;
  setServerApplicationLimitReached: (value: boolean) => void;
  startSync: () => () => void;
};

// Single count rule: the SSR cookie is only a provisional seed shown while
// storage is loading; browser storage is the source of truth afterwards.
export function selectApplicationCount(state: PersistenceState): number {
  if (state.storageStatus === 'loading') return state.initialApplicationCount;
  return state.applications.length;
}

export type PersistenceStore = StoreApi<PersistenceState>;

export function createPersistenceStore(
  config: ApplicationConfig,
  initialApplicationCount: number,
  repository: ApplicationRepository,
): PersistenceStore {
  const setApplications = (
    set: (state: { applications: StoredApplication[]; storageStatus: StorageStatus }) => void,
    nextState: { applications: StoredApplication[]; status: StorageStatus },
  ) => {
    if (nextState.status === 'ready' || nextState.status === 'invalid') {
      writeApplicationCountCookie(
        nextState.applications.length,
        config.applicationCountCookieTtlSeconds,
      );
    }
    set({
      applications: nextState.applications,
      storageStatus: nextState.status,
    });
  };

  return createStore<PersistenceState>()((set, get) => {
    const synchronizeApplications = (nextState: {
      applications: StoredApplication[];
      status: StorageStatus;
    }) => {
      setApplications(set, nextState);
      if (nextState.applications.length >= config.applicationLimit) {
        set({ serverApplicationLimitReached: true });
      }
    };

    return {
      applications: [],
      initialApplicationCount,
      storageStatus: 'loading',
      serverApplicationLimitReached: initialApplicationCount >= config.applicationLimit,
      refreshApplications() {
        synchronizeApplications(repository.initialize());
      },
      addApplication(application) {
        if (
          ![
            application.company,
            application.role,
            application.strengths,
            application.details,
            application.letter,
          ].every((value) => value.trim())
        ) {
          return false;
        }
        const nextState = repository.add(application, config.applicationLimit);
        synchronizeApplications(nextState);
        return nextState.added;
      },
      deleteApplication(id) {
        synchronizeApplications(repository.remove(id));
      },
      startSync() {
        get().refreshApplications();
        return repository.subscribe(() => {
          get().refreshApplications();
        });
      },
      setServerApplicationLimitReached(serverApplicationLimitReached) {
        set({ serverApplicationLimitReached });
      },
    };
  });
}
