// tests/integration/network-streams.test.ts
// Integration tests for network streaming commands

import { Validator, validate } from '../../src/parser/validator';
import { CommandAST } from '../../src/parser/grammar-parser';
import { executeCommand } from '../../src/runtime/engine';
import { ObservabilityEvent } from '../../src/observability/types';
import { wrapAsyncGenerator } from '../../src/observability/uol';

// Mock the console.log to capture output during tests
const originalConsoleLog = console.log;
let capturedLogs: any[] = [];

beforeEach(() => {
  capturedLogs = [];
  console.log = (...args) => {
    capturedLogs.push(...args);
  };
});

afterEach(() => {
  console.log = originalConsoleLog;
});

describe('Network Streaming Commands Integration Tests', () => {

  describe('network health stream', () => {
    test('should emit events when executing network health stream command', async () => {
      // Mock the command AST for network health stream
      const ast: CommandAST = {
        type: 'Command',
        commandPath: ['network', 'health', 'stream'],
        arguments: {
          named: {},
          positional: []
        },
        rawInput: 'network health stream'
      };

      // Validate the command
      const validationResult = validate(ast);
      expect(validationResult).not.toHaveProperty('error');
      expect((validationResult as any).commandId).toBe('network.health.stream');

      // Execute the command
      const result = await executeCommand(validationResult as any);
      expect(result.status).toBe('ok');

      // Verify that logs were captured (these should be the streaming events)
      expect(capturedLogs.length).toBeGreaterThan(0);

      // Parse the captured logs to check for observability events
      const parsedEvents = capturedLogs.map(log => {
        try {
          return JSON.parse(log);
        } catch (e) {
          return null;
        }
      }).filter(event => event !== null);

      // Check that events are observability events
      for (const event of parsedEvents) {
        expect(event).toHaveProperty('seq');
        expect(event).toHaveProperty('timestamp');
        expect(event).toHaveProperty('source', 'network');
        expect(event).toHaveProperty('event');
      }

      // Check that we have at least some events
      expect(parsedEvents.length).toBeGreaterThan(0);

      // Verify sequence numbers increment properly
      if (parsedEvents.length > 1) {
        for (let i = 1; i < parsedEvents.length; i++) {
          expect(parsedEvents[i].seq).toBe(parsedEvents[i - 1].seq + 1);
        }
      }

      // Verify timestamps are valid ISO8601
      for (const event of parsedEvents) {
        const date = new Date(event.timestamp);
        expect(date.toISOString()).toBe(event.timestamp);
      }
    });
  });

  describe('network graph stream', () => {
    test('should emit graph-update events when executing network graph stream command', async () => {
      // Mock the command AST for network graph stream
      const ast: CommandAST = {
        type: 'Command',
        commandPath: ['network', 'graph', 'stream'],
        arguments: {
          named: {},
          positional: []
        },
        rawInput: 'network graph stream'
      };

      // Validate the command
      const validationResult = validate(ast);
      expect(validationResult).not.toHaveProperty('error');
      expect((validationResult as any).commandId).toBe('network.graph.stream');

      // Execute the command
      const result = await executeCommand(validationResult as any);
      expect(result.status).toBe('ok');

      // Verify that logs were captured (these should be the streaming events)
      expect(capturedLogs.length).toBeGreaterThan(0);

      // Parse the captured logs to check for observability events
      const parsedEvents = capturedLogs.map(log => {
        try {
          return JSON.parse(log);
        } catch (e) {
          return null;
        }
      }).filter(event => event !== null);

      // Check that events are observability events
      for (const event of parsedEvents) {
        expect(event).toHaveProperty('seq');
        expect(event).toHaveProperty('timestamp');
        expect(event).toHaveProperty('source', 'network');
        expect(event).toHaveProperty('event');
      }

      // Check for graph-update events in the stream
      const graphUpdateEvents = parsedEvents.filter(event => event.event === 'graph-update');
      expect(graphUpdateEvents.length).toBeGreaterThan(0);

      // Verify each graph update event has nodes and edges
      for (const event of graphUpdateEvents) {
        expect(event.data).toHaveProperty('nodes');
        expect(event.data).toHaveProperty('edges');
        expect(Array.isArray(event.data.nodes)).toBe(true);
        expect(Array.isArray(event.data.edges)).toBe(true);
      }

      // Verify sequence numbers increment properly
      if (parsedEvents.length > 1) {
        for (let i = 1; i < parsedEvents.length; i++) {
          expect(parsedEvents[i].seq).toBe(parsedEvents[i - 1].seq + 1);
        }
      }

      // Verify timestamps are valid ISO8601
      for (const event of parsedEvents) {
        const date = new Date(event.timestamp);
        expect(date.toISOString()).toBe(event.timestamp);
      }
    });
  });

  describe('network element monitor', () => {
    test('should emit events when monitoring a specific element', async () => {
      // Mock the command AST for network element monitor with required id flag
      const ast: CommandAST = {
        type: 'Command',
        commandPath: ['network', 'element', 'monitor'],
        arguments: {
          named: { id: 'element-1' },
          positional: []
        },
        rawInput: 'network element monitor --id element-1'
      };

      // Validate the command
      const validationResult = validate(ast);
      expect(validationResult).not.toHaveProperty('error');
      expect((validationResult as any).commandId).toBe('network.element.monitor');
      expect((validationResult as any).flags.id).toBe('element-1');

      // Execute the command
      const result = await executeCommand(validationResult as any);
      expect(result.status).toBe('ok');

      // Verify that logs were captured (these should be the streaming events)
      expect(capturedLogs.length).toBeGreaterThan(0);

      // Parse the captured logs to check for observability events
      const parsedEvents = capturedLogs.map(log => {
        try {
          return JSON.parse(log);
        } catch (e) {
          return null;
        }
      }).filter(event => event !== null);

      // Check that events are observability events
      for (const event of parsedEvents) {
        expect(event).toHaveProperty('seq');
        expect(event).toHaveProperty('timestamp');
        expect(event).toHaveProperty('source', 'network');
        expect(event).toHaveProperty('event');
      }

      // Check that we have at least some events
      expect(parsedEvents.length).toBeGreaterThan(0);

      // Verify sequence numbers increment properly
      if (parsedEvents.length > 1) {
        for (let i = 1; i < parsedEvents.length; i++) {
          expect(parsedEvents[i].seq).toBe(parsedEvents[i - 1].seq + 1);
        }
      }

      // Verify timestamps are valid ISO8601
      for (const event of parsedEvents) {
        const date = new Date(event.timestamp);
        expect(date.toISOString()).toBe(event.timestamp);
      }
    });

    test('should require an id flag for network element monitor command', () => {
      // Mock the command AST for network element monitor without id flag
      const ast: CommandAST = {
        type: 'Command',
        commandPath: ['network', 'element', 'monitor'],
        arguments: {
          named: {},
          positional: []
        },
        rawInput: 'network element monitor'
      };

      // Validate the command - should fail due to missing id
      const validationResult = validate(ast);
      expect(validationResult).toHaveProperty('error');
      expect((validationResult as any).code).toBe('MISSING_REQUIRED_FLAG');
    });
  });

  describe('Interrupt handling', () => {
    test('should handle interruption gracefully and emit interrupt event', async () => {
      // Create a custom mock generator that simulates interruption
      async function* mockInterruptedGenerator() {
        yield { event: 'status', data: { status: 'online' }, timestamp: new Date().toISOString() };
        yield { event: 'metric', data: { cpu: 50, mem: 60 }, timestamp: new Date().toISOString() };
        // Simulate an interruption by throwing an error
        throw new Error('simulated interruption');
      }

      // Test the wrapAsyncGenerator function with network source and the mock generator
      const wrappedGenerator = wrapAsyncGenerator('network', mockInterruptedGenerator() as any);
      const events: ObservabilityEvent[] = [];

      try {
        for await (const event of wrappedGenerator) {
          events.push(event);
        }
      } catch (error) {
        // Ignore the error since we're simulating interruption
      }

      // Check that we got observability events
      expect(events.length).toBeGreaterThan(0);

      // Check that the last event is an interrupt event
      const lastEvent = events[events.length - 1];
      expect(lastEvent.event).toBe('interrupt');
      expect(lastEvent.source).toBe('network');
      expect(lastEvent.message).toBe('Stream interrupted');
    });
  });
});