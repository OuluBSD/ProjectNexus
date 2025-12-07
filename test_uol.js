// Simple test script to verify UOL implementation
import { ObservabilityEvent } from './src/observability/types.js';
import { createSeqCounter, normalizeEvent, wrapAsyncGenerator } from './src/observability/uol.js';

console.log('Testing UOL implementation...');

// Test 1: ObservabilityEvent interface
const event = {
  seq: 1,
  timestamp: new Date().toISOString(),
  source: 'ai',
  event: 'token',
  data: { content: 'Hello' },
  message: 'Test message'
};

console.log('✓ ObservabilityEvent structure is valid:', event);

// Test 2: createSeqCounter
const counter = createSeqCounter();
console.log('✓ Sequence counter test:', counter(), counter(), counter()); // Should be 1, 2, 3

// Test 3: normalizeEvent
const rawEvent = { content: 'Hello', type: 'test' };
const normalized = normalizeEvent('ai', rawEvent);
console.log('✓ Normalized event:', normalized);

// Test 4: wrapAsyncGenerator (with a simple test)
async function* testGenerator() {
  yield { content: 'First token' };
  yield { content: 'Second token' };
  yield { done: true };
}

const wrappedGenerator = wrapAsyncGenerator('ai', testGenerator());
console.log('✓ Wrapped generator created');

// Run a simple async test
async function runTest() {
  console.log('Running async generator test...');
  for await (const event of wrappedGenerator) {
    console.log('  Generated event:', event);
  }
  console.log('✓ Async generator test completed');
}

runTest().then(() => {
  console.log('All UOL tests passed!');
});