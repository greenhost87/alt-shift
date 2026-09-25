import { addApplication, deleteApplication, initializeApplications } from './storage';
import type { AddApplicationResult, ApplicationsState } from './storage';
import type { ApplicationStorageConfig } from '../config/application.types';
import type { NewStoredApplication } from './schema';

export type ApplicationRepository = {
  initialize: () => ApplicationsState;
  add: (application: NewStoredApplication, limit: number) => AddApplicationResult;
  remove: (id: string) => ApplicationsState;
  subscribe: (listener: () => void) => () => void;
};

export function createApplicationRepository(
  config: ApplicationStorageConfig,
): ApplicationRepository {
  return {
    initialize() {
      return initializeApplications(config);
    },
    add(application, limit) {
      return addApplication(application, limit, config);
    },
    remove(id) {
      return deleteApplication(id, config);
    },
    subscribe(listener) {
      const refreshFromStorage = (event: StorageEvent) => {
        if (event.key === config.key || event.key === null) listener();
      };
      window.addEventListener('storage', refreshFromStorage);
      return () => {
        window.removeEventListener('storage', refreshFromStorage);
      };
    },
  };
}
