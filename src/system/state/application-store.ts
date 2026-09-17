import { createStore } from 'zustand/vanilla';
import type { StoreApi } from 'zustand/vanilla';
import {
  addApplication as persistApplication,
  deleteApplication as removePersistedApplication,
  readApplications,
} from '../applications/storage';
import type { NewStoredApplication } from '../applications/storage';
import type { StoredApplication } from '../applications/schema';
import { writeApplicationCountCookie } from '../applications/count-cookie';
import type { ApplicationConfig } from '../config/application.types';

const GENERATION_PHASES = [
  'idle',
  'submitting',
  'waiting-for-first-token',
  'streaming',
  'completed',
  'failed',
] as const;

export type GenerationPhase = (typeof GENERATION_PHASES)[number];

const STORAGE_STATUSES = ['loading', 'ready', 'invalid', 'unavailable'] as const;

export type StorageStatus = (typeof STORAGE_STATUSES)[number];

export type ApplicationState = {
  config: ApplicationConfig;
  applications: StoredApplication[];
  applicationCount: number;
  storageStatus: StorageStatus;
  jobTitle: string;
  company: string;
  strengths: string;
  details: string;
  generationPhase: GenerationPhase;
  letter: string;
  generationError: string;
  generatorCopyError: string;
  retryAvailableAt: number | undefined;
  dashboardCopyError: string;
  pendingDeletion: string | null;
  refreshApplications: () => void;
  addApplication: (application: NewStoredApplication) => boolean;
  deleteApplication: (id: string) => void;
  setJobTitle: (value: string) => void;
  setCompany: (value: string) => void;
  setStrengths: (value: string) => void;
  setDetails: (value: string) => void;
  setGenerationPhase: (phase: GenerationPhase) => void;
  setLetter: (letter: string) => void;
  setGenerationError: (message: string) => void;
  setGeneratorCopyError: (message: string) => void;
  setRetryAvailableAt: (value: number | undefined) => void;
  resetGenerator: () => void;
  setDashboardCopyError: (message: string) => void;
  setPendingDeletion: (id: string | null) => void;
  resetDashboard: () => void;
};

export type ApplicationStore = StoreApi<ApplicationState>;

function getInitialGeneratorState(config: ApplicationConfig) {
  return {
    jobTitle: config.initialForm.jobTitle,
    company: config.initialForm.company,
    strengths: config.initialForm.strengths,
    details: config.initialForm.details,
    generationPhase: 'idle' as const,
    letter: '',
    generationError: '',
    generatorCopyError: '',
    retryAvailableAt: undefined,
  };
}

export function createApplicationStore(
  config: ApplicationConfig,
  initialApplicationCount: number,
): ApplicationStore {
  const setApplications = (
    set: (state: {
      applications: StoredApplication[];
      applicationCount: number;
      storageStatus: StorageStatus;
    }) => void,
    nextState: { applications: StoredApplication[]; status: StorageStatus },
  ) => {
    const applicationCount = nextState.applications.length;
    if (nextState.status === 'ready' || nextState.status === 'invalid') {
      writeApplicationCountCookie(applicationCount, config.applicationCountCookieTtlSeconds);
    }
    set({
      applications: nextState.applications,
      applicationCount,
      storageStatus: nextState.status,
    });
  };

  return createStore<ApplicationState>()((set) => ({
    config,
    applications: [],
    applicationCount: initialApplicationCount,
    storageStatus: 'loading',
    ...getInitialGeneratorState(config),
    dashboardCopyError: '',
    pendingDeletion: null,
    refreshApplications() {
      setApplications(set, readApplications(config.storage));
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
      const nextState = persistApplication(application, config.applicationLimit, config.storage);
      setApplications(set, nextState);
      return nextState.added;
    },
    deleteApplication(id) {
      setApplications(set, removePersistedApplication(id, config.storage));
    },
    setJobTitle(jobTitle) {
      set({ jobTitle });
    },
    setCompany(company) {
      set({ company });
    },
    setStrengths(strengths) {
      set({ strengths });
    },
    setDetails(details) {
      set({ details });
    },
    setGenerationPhase(generationPhase) {
      set({ generationPhase });
    },
    setLetter(letter) {
      set({ letter });
    },
    setGenerationError(generationError) {
      set({ generationError });
    },
    setGeneratorCopyError(generatorCopyError) {
      set({ generatorCopyError });
    },
    setRetryAvailableAt(retryAvailableAt) {
      set({ retryAvailableAt });
    },
    resetGenerator() {
      set(getInitialGeneratorState(config));
    },
    setDashboardCopyError(dashboardCopyError) {
      set({ dashboardCopyError });
    },
    setPendingDeletion(pendingDeletion) {
      set({ pendingDeletion });
    },
    resetDashboard() {
      set({ dashboardCopyError: '', pendingDeletion: null });
    },
  }));
}
