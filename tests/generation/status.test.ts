import { expect, test } from 'bun:test';
import { createGenerationStore } from '../../src/system/state/generation-store';

test('starts idle without letter, error, or retry metadata', () => {
  const store = createGenerationStore();

  expect(store.getState().status).toEqual({ phase: 'idle' });
});

test('streams deltas into a letter and completes with it', () => {
  const store = createGenerationStore();

  store.getState().startSubmission();
  expect(store.getState().status).toEqual({ phase: 'submitting' });

  store.getState().markWaitingForFirstToken();
  expect(store.getState().status).toEqual({ phase: 'waiting-for-first-token' });

  store.getState().setStreamingLetter('Hello');
  store.getState().setStreamingLetter('Hello world');
  expect(store.getState().status).toEqual({ phase: 'streaming', letter: 'Hello world' });

  store.getState().completeGeneration();
  expect(store.getState().status).toEqual({ phase: 'completed', letter: 'Hello world' });
});

test('fails atomically with the streamed letter, error, and retry metadata', () => {
  const store = createGenerationStore();

  store.getState().startSubmission();
  store.getState().setStreamingLetter('Partial');
  store.getState().failGeneration('Rate limited', 1_750_000_000_000);

  expect(store.getState().status).toEqual({
    phase: 'failed',
    letter: 'Partial',
    error: 'Rate limited',
    retryAvailableAt: 1_750_000_000_000,
  });
});

test('clears retry availability without touching the letter or error', () => {
  const store = createGenerationStore();

  store.getState().startSubmission();
  store.getState().failGeneration('Rate limited', 1_750_000_000_000);
  store.getState().clearRetryAvailability();

  expect(store.getState().status).toEqual({
    phase: 'failed',
    letter: '',
    error: 'Rate limited',
    retryAvailableAt: undefined,
  });
});

test('drops letter, error, and retry metadata when a new submission starts', () => {
  const store = createGenerationStore();

  store.getState().startSubmission();
  store.getState().setStreamingLetter('Partial');
  store.getState().failGeneration('Rate limited', 1_750_000_000_000);
  store.getState().startSubmission();

  expect(store.getState().status).toEqual({ phase: 'submitting' });
});

test('ignores out-of-order transitions instead of corrupting the status', () => {
  const store = createGenerationStore();

  store.getState().markWaitingForFirstToken();
  store.getState().completeGeneration();
  store.getState().clearRetryAvailability();
  expect(store.getState().status).toEqual({ phase: 'idle' });

  store.getState().resetGeneration();
  expect(store.getState().status).toEqual({ phase: 'idle' });
});
