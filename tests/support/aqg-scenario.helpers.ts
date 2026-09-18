import * as playwright from '@playwright/test';

type ScenarioStepBody = () => Promise<void>;
type ScenarioPhase = (description: string, body: ScenarioStepBody) => Promise<void>;
type ScenarioWhenDetails = {
  description: string;
  covers: string | readonly string[];
};
type ScenarioWhen = (details: ScenarioWhenDetails, body: ScenarioStepBody) => Promise<void>;

type ScenarioPhases = {
  given: ScenarioPhase;
  when: ScenarioWhen;
  then: ScenarioPhase;
};

function requiredDescription(phaseName: 'given' | 'when' | 'then', value: string): string {
  const description = value.trim();
  if (description.length === 0) {
    throw new Error(`scenario ${phaseName} description must not be empty`);
  }
  return description;
}

function phase(name: 'given' | 'then'): ScenarioPhase {
  return async (rawDescription, body) => {
    const description = requiredDescription(name, rawDescription);
    await playwright.test.step(description, body, {
      params: { aqgPhase: name, aqgDescription: description },
    });
  };
}

function coveredObligations(value: string | readonly string[]): string[] {
  const obligations = (typeof value === 'string' ? [value] : [...value]).map((id) => id.trim());
  if (obligations.length === 0 || obligations.some((id) => id.length === 0)) {
    throw new Error('scenario when covers must contain at least one non-empty obligation id');
  }
  if (new Set(obligations).size !== obligations.length) {
    throw new Error('scenario when covers must not contain duplicate obligation ids');
  }
  return obligations;
}

const when: ScenarioWhen = async (details, body) => {
  const description = requiredDescription('when', details.description);
  const obligations = coveredObligations(details.covers);
  await playwright.test.step(description, body, {
    params: {
      aqgPhase: 'when',
      aqgDescription: description,
      aqgObligations: obligations,
    },
  });
};

export const scenario = playwright.test.extend<ScenarioPhases>({
  given: async ({}, provide) => {
    await provide(phase('given'));
  },
  when: async ({}, provide) => {
    await provide(when);
  },
  then: async ({}, provide) => {
    await provide(phase('then'));
  },
});

export const expect = playwright.expect;
