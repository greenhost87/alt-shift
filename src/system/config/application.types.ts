import type { StoredApplication } from '../applications/schema';

export type GenerationFieldLimits = {
  jobTitle: number;
  company: number;
  strengths: number;
  details: number;
};

export type InitialApplicationForm = {
  jobTitle: string;
  company: string;
  strengths: string;
  details: string;
};

export type ApplicationStorageConfig = {
  key: string;
  version: number;
  changeEvent: string;
  initialApplications: StoredApplication[];
};

export type ApplicationConfig = {
  applicationCountCookieTtlSeconds: number;
  applicationLimit: number;
  copyFeedbackTimeoutMs: number;
  fieldLimits: GenerationFieldLimits;
  initialForm: InitialApplicationForm;
  storage: ApplicationStorageConfig;
};
