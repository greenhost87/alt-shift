import { createContext, useContext } from 'react';
import type { ReactNode } from 'react';
import type { ApplicationConfig } from './application.types';

const ApplicationConfigContext = createContext<ApplicationConfig | undefined>(undefined);

type ApplicationConfigProviderProps = {
  children: ReactNode;
  value: ApplicationConfig;
};

export function ApplicationConfigProvider({ children, value }: ApplicationConfigProviderProps) {
  return (
    <ApplicationConfigContext.Provider value={value}>{children}</ApplicationConfigContext.Provider>
  );
}

export function useApplicationConfig(): ApplicationConfig {
  const config = useContext(ApplicationConfigContext);
  if (!config) throw new Error('Application configuration is unavailable.');
  return config;
}
