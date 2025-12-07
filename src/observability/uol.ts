import { ObservabilityEvent } from './types';

/**
 * Creates a sequence counter closure that returns incrementing sequence numbers.
 */
export function createSeqCounter(): () => number {
  let seq = 0;
  return () => ++seq;
}

/**
 * Normalizes a raw event into the unified ObservabilityEvent format.
 */
export function normalizeEvent(
  source: "ai" | "process" | "websocket" | "poll" | "network",
  rawEvent: any
): ObservabilityEvent {
  const seqCounter = createSeqCounter();
  
  return {
    seq: seqCounter(),
    timestamp: new Date().toISOString(),
    source,
    event: rawEvent.event || 'unknown',
    data: rawEvent.data || rawEvent,
    message: rawEvent.message
  };
}

/**
 * Wraps an async generator to emit standardized ObservabilityEvents.
 */
export async function* wrapAsyncGenerator<T>(
  source: "ai" | "process" | "websocket" | "poll" | "network",
  generator: AsyncGenerator<T>,
  event?: string
): AsyncGenerator<ObservabilityEvent> {
  const getSequenceNumber = createSeqCounter();

  try {
    for await (const rawEvent of generator) {
      yield {
        seq: getSequenceNumber(),
        timestamp: new Date().toISOString(),
        source,
        event: event || (typeof rawEvent === 'object' && rawEvent && (rawEvent as any).event) ? (rawEvent as any).event : 'data',
        data: rawEvent,
      };
    }
  } catch (error) {
    // If interrupted, emit an interrupt event
    if (error instanceof Error && (error.name === 'AbortError' || error.message.includes('aborted') || error.message.includes('interrupted'))) {
      yield {
        seq: getSequenceNumber(),
        timestamp: new Date().toISOString(),
        source,
        event: 'interrupt',
        message: 'Stream interrupted',
      };
    } else {
      throw error; // Re-throw other errors
    }
  }
}