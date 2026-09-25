import { createContext, useContext, useEffect, useRef } from 'react';
import type { ReactNode } from 'react';
import { useStore } from 'zustand';
import type { ApplicationConfig } from '../config/application.types';
import { createApplicationRepository } from '../applications/repository';
import { createFormDraftStore } from './form-draft-store';
import type { FormDraftState, FormDraftStore } from './form-draft-store';
import { createGenerationStore } from './generation-store';
import type { GenerationState, GenerationStore } from './generation-store';
import { createPersistenceStore } from './persistence-store';
import type { PersistenceState, PersistenceStore } from './persistence-store';

const ApplicationConfigContext = createContext<ApplicationConfig | undefined>(undefined);

type ApplicationStores = {
  persistence: PersistenceStore;
  generation: GenerationStore;
  formDraft: FormDraftStore;
};

const ApplicationStoresContext = createContext<ApplicationStores | undefined>(undefined);

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
  const stores = useRef<ApplicationStores | null>(null);
  stores.current ??= {
    persistence: createPersistenceStore(
      config,
      initialApplicationCount,
      createApplicationRepository(config.storage),
    ),
    generation: createGenerationStore(),
    formDraft: createFormDraftStore(config.initialForm),
  };

  useEffect(() => {
    const currentStores = stores.current;
    if (currentStores === null) return () => {};
    return currentStores.persistence.getState().startSync();
  }, []);

  return (
    <ApplicationConfigContext.Provider value={config}>
      <ApplicationStoresContext.Provider value={stores.current}>
        {children}
      </ApplicationStoresContext.Provider>
    </ApplicationConfigContext.Provider>
  );
}

function useApplicationStores() {
  const stores = useContext(ApplicationStoresContext);
  if (!stores) throw new Error('Application state is unavailable.');
  return stores;
}

export function useApplicationConfig() {
  const config = useContext(ApplicationConfigContext);
  if (!config) throw new Error('Application configuration is unavailable.');
  return config;
}

export function usePersistenceStore<Selection>(
  selector: (state: PersistenceState) => Selection,
): Selection {
  return useStore(useApplicationStores().persistence, selector);
}

export function useGenerationStore<Selection>(
  selector: (state: GenerationState) => Selection,
): Selection {
  return useStore(useApplicationStores().generation, selector);
}

export function useFormDraftStore<Selection>(
  selector: (state: FormDraftState) => Selection,
): Selection {
  return useStore(useApplicationStores().formDraft, selector);
}
