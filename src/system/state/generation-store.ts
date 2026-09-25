import { createStore } from 'zustand/vanilla';
import type { StoreApi } from 'zustand/vanilla';

const GENERATION_PHASES = [
  'idle',
  'submitting',
  'waiting-for-first-token',
  'streaming',
  'completed',
  'failed',
] as const;

export type GenerationPhase = (typeof GENERATION_PHASES)[number];

export type IdleGeneration = {
  phase: 'idle';
};

export type SubmittingGeneration = {
  phase: 'submitting';
};

export type WaitingForFirstTokenGeneration = {
  phase: 'waiting-for-first-token';
};

export type StreamingGeneration = {
  phase: 'streaming';
  letter: string;
};

export type CompletedGeneration = {
  phase: 'completed';
  letter: string;
};

export type FailedGeneration = {
  phase: 'failed';
  letter: string;
  error: string;
  retryAvailableAt: number | undefined;
};

export type GenerationStatus =
  | IdleGeneration
  | SubmittingGeneration
  | WaitingForFirstTokenGeneration
  | StreamingGeneration
  | CompletedGeneration
  | FailedGeneration;

export type GenerationState = {
  status: GenerationStatus;
  startSubmission: () => void;
  markWaitingForFirstToken: () => void;
  setStreamingLetter: (letter: string) => void;
  completeGeneration: () => void;
  failGeneration: (error: string, retryAvailableAt: number | undefined) => void;
  clearRetryAvailability: () => void;
  resetGeneration: () => void;
};

export type GenerationStore = StoreApi<GenerationState>;

const INITIAL_STATUS: GenerationStatus = { phase: 'idle' };

function statusLetter(status: GenerationStatus): string {
  if (status.phase === 'streaming' || status.phase === 'completed' || status.phase === 'failed') {
    return status.letter;
  }
  return '';
}

export function createGenerationStore(): GenerationStore {
  return createStore<GenerationState>()((set, get) => ({
    status: INITIAL_STATUS,
    startSubmission() {
      set({ status: { phase: 'submitting' } });
    },
    markWaitingForFirstToken() {
      if (get().status.phase !== 'submitting') return;
      set({ status: { phase: 'waiting-for-first-token' } });
    },
    setStreamingLetter(letter) {
      set({ status: { phase: 'streaming', letter } });
    },
    completeGeneration() {
      const current = get().status;
      if (current.phase !== 'streaming') return;
      set({ status: { phase: 'completed', letter: current.letter } });
    },
    failGeneration(error, retryAvailableAt) {
      set({
        status: {
          phase: 'failed',
          letter: statusLetter(get().status),
          error,
          retryAvailableAt,
        },
      });
    },
    clearRetryAvailability() {
      const current = get().status;
      if (current.phase !== 'failed') return;
      set({ status: { ...current, retryAvailableAt: undefined } });
    },
    resetGeneration() {
      set({ status: INITIAL_STATUS });
    },
  }));
}
