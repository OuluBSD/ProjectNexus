import { ObservabilityEvent } from './types';
import { v4 as uuidv4 } from 'uuid';

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
  event?: string,
  sourceId?: string,
  streamKind?: string
): AsyncGenerator<ObservabilityEvent> {
  const getSequenceNumber = createSeqCounter();
  const correlationId = uuidv4(); // Generate a single correlation ID for the entire stream

  // Emit a stream start event to mark the beginning of the stream
  yield {
    seq: getSequenceNumber(),
    timestamp: new Date().toISOString(),
    source,
    event: 'stream-start',
    message: `Started streaming ${streamKind || 'unknown'} from ${source}`,
    correlationId,
    sourceId,
    metadata: {
      streamKind: streamKind || `${source}-stream`
    }
  };

  try {
    for await (const rawEvent of generator) {
      yield {
        seq: getSequenceNumber(),
        timestamp: new Date().toISOString(),
        source,
        event: event || (typeof rawEvent === 'object' && rawEvent && (rawEvent as any).event) ? (rawEvent as any).event : 'data',
        data: rawEvent,
        correlationId,
        sourceId,
        metadata: {
          streamKind: streamKind || `${source}-stream`,
          ...(typeof rawEvent === 'object' && rawEvent && (rawEvent as any).metadata ? (rawEvent as any).metadata : {})
        }
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
        correlationId,
        sourceId,
        metadata: {
          streamKind: streamKind || `${source}-stream`
        }
      };
    } else {
      throw error; // Re-throw other errors
    }
  }

  // Emit a stream end event to mark the completion of the stream
  yield {
    seq: getSequenceNumber(),
    timestamp: new Date().toISOString(),
    source,
    event: 'stream-end',
    message: `Completed streaming ${streamKind || 'unknown'} from ${source}`,
    correlationId,
    sourceId,
    metadata: {
      streamKind: streamKind || `${source}-stream`
    }
  };
}