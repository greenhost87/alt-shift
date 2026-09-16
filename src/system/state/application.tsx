import { createContext, useContext, useEffect, useRef } from 'react';
import type { ReactNode } from 'react';
import { useStore } from 'zustand';
import type { ApplicationConfig } from '../config/application.types';
import { createApplicationStore } from './application-store';
import type { ApplicationState, ApplicationStore } from './application-store';

const ApplicationStoreContext = createContext<ApplicationStore | undefined>(undefined);

type ApplicationStateProviderProps = {
  children: ReactNode;
  config: ApplicationConfig;
  initialApplicationCount: number;
};

export function ApplicationStateProvider({
  children,
  config,
  initialApplicationCount,
}: ApplicationStateProviderProps) {
  const store = useRef<ApplicationStore | null>(null);
  store.current ??= createApplicationStore(config, initialApplicationCount);

  useEffect(() => {
    const currentStore = store.current;
    if (currentStore === null) return () => {};
    const refresh = currentStore.getState().refreshApplications;
    const refreshFromStorage = (event: StorageEvent) => {
      if (event.key === config.storage.key || event.key === null) refresh();
    };

    refresh();
    window.addEventListener('storage', refreshFromStorage);
    window.addEventListener(config.storage.changeEvent, refresh);
    return () => {
      window.removeEventListener('storage', refreshFromStorage);
      window.removeEventListener(config.storage.changeEvent, refresh);
    };
  }, [config]);

  return (
    <ApplicationStoreContext.Provider value={store.current}>
      {children}
    </ApplicationStoreContext.Provider>
  );
}

export function useApplicationStore<Selection>(
  selector: (state: ApplicationState) => Selection,
): Selection {
  const store = useContext(ApplicationStoreContext);
  if (!store) throw new Error('Application state is unavailable.');
  return useStore(store, selector);
}
