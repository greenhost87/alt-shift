import * as v from 'valibot';
import * as m from '../../paraglide/messages.js';
import { withBasePath } from '../config/base-path';
import { BASE_PATH } from '../config/environment';
import { GenerationError, GenerationTimeoutError } from './errors';
import type { GenerationRequest } from './schema';
import { consumeEventStream } from './stream';
import { requestGenerationStream } from './transport';

type GenerateOptions = {
  endpoint?: string | undefined;
  signal?: AbortSignal;
  onOpen?: () => void;
  onDelta: (delta: string) => void;
};

type InactivityTimer = {
  clear: () => void;
  reset: () => void;
};

function createInactivityTimer(
  controller: AbortController,
  inactivityTimeoutMs: number,
): InactivityTimer {
  let timeout: ReturnType<typeof setTimeout> | undefined;
  return {
    clear() {
      clearTimeout(timeout);
    },
    reset() {
      clearTimeout(timeout);
      timeout = setTimeout(() => {
        controller.abort('inactivity-timeout');
      }, inactivityTimeoutMs);
    },
  };
}

function linkCallerSignal(controller: AbortController, signal: AbortSignal | undefined) {
  const abortFromCaller = () => {
    controller.abort(new DOMException('Aborted', 'AbortError'));
  };
  if (signal?.aborted) abortFromCaller();
  else signal?.addEventListener('abort', abortFromCaller, { once: true });
  return () => signal?.removeEventListener('abort', abortFromCaller);
}

function rethrowGenerationError(error: Error, controller: AbortController): never {
  if (error instanceof GenerationError || controller.signal.aborted) throw error;
  throw new GenerationError(m.application_generation_failed());
}

export async function generateApplication(
  request: GenerationRequest,
  { endpoint = withBasePath(BASE_PATH, '/api/generate'), signal, onOpen, onDelta }: GenerateOptions,
): Promise<void> {
  const controller = new AbortController();
  const unlinkCallerSignal = linkCallerSignal(controller, signal);
  let inactivityTimeoutMs: number | undefined;
  let timer: InactivityTimer | undefined;
  let reader: ReadableStreamDefaultReader<Uint8Array> | undefined;

  try {
    const stream = await requestGenerationStream(request, controller.signal, endpoint);
    inactivityTimeoutMs = stream.inactivityTimeoutMs;
    const inactivityTimer = createInactivityTimer(controller, inactivityTimeoutMs);
    timer = inactivityTimer;
    inactivityTimer.reset();
    onOpen?.();
    reader = stream.body.getReader();
    await consumeEventStream(reader, controller.signal, (delta) => {
      inactivityTimer.reset();
      onDelta(delta);
    });
  } catch (error) {
    if (controller.signal.reason === 'inactivity-timeout') {
      throw new GenerationTimeoutError(
        m.generation_timeout({
          seconds: Math.ceil((inactivityTimeoutMs ?? 0) / 1_000),
        }),
        inactivityTimeoutMs ?? 0,
      );
    }
    rethrowGenerationError(v.parse(v.instance(Error), error), controller);
  } finally {
    timer?.clear();
    unlinkCallerSignal();
    if (controller.signal.aborted) await reader?.cancel().catch(() => undefined);
    reader?.releaseLock();
  }
}
