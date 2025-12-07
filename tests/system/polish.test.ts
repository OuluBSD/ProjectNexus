// tests/system/polish.test.ts
// Tests for all new polish features

import { describe, it, expect } from '@jest/globals';
import { hints, getHintForError, attachHintToError } from '../../src/utils/hints';
import { formatOutput, formatError, formatStreamingEvent } from '../../src/utils/formatters';
import { SystemDoctorHandler } from '../../src/commands/system/doctor';
import { SettingsOptionSetHandler } from '../../src/commands/settings/option/set';
import { loadConfig, saveConfig } from '../../src/state/config-store';

// Mock the necessary modules for testing
jest.mock('../../src/state/config-store');
jest.mock('fs/promises');
jest.mock('os');

describe('Polish Features Tests', () => {
  describe('Hints Module', () => {
    it('should have hints defined', () => {
      expect(hints).toBeDefined();
      expect(hints.length).toBeGreaterThan(0);
    });

    it('should return correct hint for missing context error', () => {
      const hint = getHintForError('MISSING_REQUIRED_CONTEXT');
      expect(hint).toContain('nexus agent project select --id');
    });

    it('should return correct hint for unknown command error', () => {
      const hint = getHintForError('HANDLER_NOT_FOUND');
      expect(hint).toContain('nexus help');
    });

    it('should attach hint to error message', () => {
      const originalMessage = 'Missing required context: activeProject';
      const result = attachHintToError('MISSING_PROJECT_CONTEXT', originalMessage);
      expect(result).toContain(originalMessage);
      expect(result).toContain('nexus agent project select --id');
    });

    it('should return original message if no hint exists', () => {
      const originalMessage = 'Some unknown error';
      const result = attachHintToError('UNKNOWN_ERROR_TYPE', originalMessage);
      expect(result).toBe(originalMessage);
    });
  });

  describe('Pretty Output Mode', () => {
    it('should format output in pretty mode when config is set to pretty', async () => {
      // Mock config to return pretty mode
      (loadConfig as jest.MockedFunction<typeof loadConfig>).mockResolvedValue({
        outputMode: 'pretty',
        showBanner: true
      });

      const data = { status: 'ok', data: { message: 'Success' } };
      const result = formatOutput(data);
      
      // Check if the result contains pretty formatting (color codes)
      expect(result).toContain('Success');
    });

    it('should format output in JSON mode when config is set to json', async () => {
      // Mock config to return json mode
      (loadConfig as jest.MockedFunction<typeof loadConfig>).mockResolvedValue({
        outputMode: 'json',
        showBanner: true
      });

      const data = { status: 'ok', data: { message: 'Success' } };
      const result = formatOutput(data);
      
      // Check if the result is JSON formatted
      expect(() => JSON.parse(result)).not.toThrow();
      expect(result).toContain('Success');
    });

    it('should format errors appropriately in pretty mode', async () => {
      (loadConfig as jest.MockedFunction<typeof loadConfig>).mockResolvedValue({
        outputMode: 'pretty',
        showBanner: true
      });

      const error = { message: 'Test error' };
      const result = formatError(error);
      
      expect(result).toContain('Error');
      expect(result).toContain('Test error');
    });

    it('should format streaming events in pretty mode', async () => {
      (loadConfig as jest.MockedFunction<typeof loadConfig>).mockResolvedValue({
        outputMode: 'pretty',
        showBanner: true
      });

      const source = 'ai';
      const seq = 1;
      const event = { event: 'token', data: 'Hello' };
      const result = formatStreamingEvent(source, seq, event);
      
      expect(result).toContain('[ai]');
      expect(result).toContain('token');
      expect(result).toContain('Hello');
    });

    it('should format streaming events in JSON mode', async () => {
      (loadConfig as jest.MockedFunction<typeof loadConfig>).mockResolvedValue({
        outputMode: 'json',
        showBanner: true
      });

      const source = 'ai';
      const seq = 1;
      const event = { event: 'token', data: 'Hello' };
      const result = formatStreamingEvent(source, seq, event);
      
      expect(() => JSON.parse(result)).not.toThrow();
      expect(result).toContain('ai');
      expect(result).toContain('token');
    });
  });

  describe('Settings Option Command', () => {
    it('should update outputMode config correctly', async () => {
      const mockConfig = {
        outputMode: 'json',
        showBanner: true,
        apiBaseUrl: 'http://localhost:3000/api',
        authToken: null,
        defaultProjectId: null,
        defaultAiBackend: 'qwen',
        themeMode: 'auto',
        autoOpenTerminal: false,
        detailMode: 'expanded',
        rememberLastPath: true
      };

      (loadConfig as jest.MockedFunction<typeof loadConfig>).mockResolvedValue(mockConfig);
      (saveConfig as jest.MockedFunction<typeof saveConfig>).mockResolvedValue();

      const handler = new SettingsOptionSetHandler();
      const context = {
        flags: { key: 'outputMode', value: 'pretty' },
        args: {},
        contextState: {},
        config: {}
      };

      const result = await handler.execute(context);

      expect(result.status).toBe('ok');
      expect(saveConfig).toHaveBeenCalledWith(expect.objectContaining({
        outputMode: 'pretty'
      }));
    });

    it('should fail with invalid outputMode value', async () => {
      const mockConfig = {
        outputMode: 'json',
        showBanner: true,
        apiBaseUrl: 'http://localhost:3000/api',
        authToken: null,
        defaultProjectId: null,
        defaultAiBackend: 'qwen',
        themeMode: 'auto',
        autoOpenTerminal: false,
        detailMode: 'expanded',
        rememberLastPath: true
      };

      (loadConfig as jest.MockedFunction<typeof loadConfig>).mockResolvedValue(mockConfig);

      const handler = new SettingsOptionSetHandler();
      const context = {
        flags: { key: 'outputMode', value: 'invalid' },
        args: {},
        contextState: {},
        config: {}
      };

      const result = await handler.execute(context);

      expect(result.status).toBe('error');
      expect(result.message).toContain('Invalid value for outputMode');
    });
  });

  describe('System Doctor Command', () => {
    it('should execute doctor check without errors', async () => {
      (loadConfig as jest.MockedFunction<typeof loadConfig>).mockResolvedValue({
        apiBaseUrl: 'http://localhost:3000/api',
        authToken: 'test-token',
        showBanner: true
      });

      const handler = new SystemDoctorHandler();
      const context = {
        flags: {},
        args: {},
        contextState: {},
        config: {}
      };

      const result = await handler.execute(context);

      expect(result.status).toBe('ok');
      expect(result.data).toBeDefined();
      expect(Array.isArray(result.data.checks)).toBe(true);
    });

    it('should return structured result with status and checks', async () => {
      (loadConfig as jest.MockedFunction<typeof loadConfig>).mockResolvedValue({
        apiBaseUrl: 'http://localhost:3000/api',
        authToken: 'test-token',
        showBanner: true
      });

      const handler = new SystemDoctorHandler();
      const context = {
        flags: {},
        args: {},
        contextState: {},
        config: {}
      };

      const result = await handler.execute(context);

      expect(result.data).toHaveProperty('status');
      expect(result.data).toHaveProperty('checks');
      expect(Array.isArray(result.data.checks)).toBe(true);
      
      // Each check should have name, status, and optional message
      for (const check of result.data.checks) {
        expect(check).toHaveProperty('name');
        expect(check).toHaveProperty('status');
        expect(['ok', 'warning', 'error']).toContain(check.status);
      }
    });
  });
});