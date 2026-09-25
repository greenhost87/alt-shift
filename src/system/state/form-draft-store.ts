import { createStore } from 'zustand/vanilla';
import type { StoreApi } from 'zustand/vanilla';
import type { InitialApplicationForm } from '../config/application.types';

export type FormDraftState = {
  jobTitle: string;
  company: string;
  strengths: string;
  details: string;
  setJobTitle: (value: string) => void;
  setCompany: (value: string) => void;
  setStrengths: (value: string) => void;
  setDetails: (value: string) => void;
  resetForm: (initialForm: InitialApplicationForm) => void;
};

export type FormDraftStore = StoreApi<FormDraftState>;

export function createFormDraftStore(initialForm: InitialApplicationForm): FormDraftStore {
  return createStore<FormDraftState>()((set) => ({
    ...initialForm,
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
    resetForm(nextInitialForm) {
      set({ ...nextInitialForm });
    },
  }));
}
