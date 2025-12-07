// src/utils/formatters.ts
// Formatting utilities

import chalk from 'chalk';
import { loadConfig } from '../state/config-store';

export function formatOutput(data: any): string {
  // Load the current config to determine output mode
  const config = loadConfigSync();

  if (config.outputMode === 'pretty') {
    return formatOutputPretty(data);
  } else {
    return JSON.stringify(data, null, 2);
  }
}

export function formatError(error: any): string {
  // Load the current config to determine output mode
  const config = loadConfigSync();

  if (config.outputMode === 'pretty') {
    return formatErrorPretty(error);
  } else {
    return JSON.stringify({
      status: 'error',
      data: null,
      message: error?.message || 'An unknown error occurred',
      errors: [{
        type: 'GENERAL_ERROR',
        message: error?.message || 'An unknown error occurred',
        timestamp: new Date().toISOString()
      }]
    }, null, 2);
  }
}

function loadConfigSync(): any {
  try {
    // Load the config synchronously by reading the file directly
    const fs = require('fs');
    const os = require('os');
    const path = require('path');

    const configPath = path.join(os.homedir(), '.nexus', 'config.json');

    if (fs.existsSync(configPath)) {
      const configContent = fs.readFileSync(configPath, 'utf-8');
      return JSON.parse(configContent);
    } else {
      // Return default config if file doesn't exist
      return {
        outputMode: 'pretty',
        showBanner: true
      };
    }
  } catch (error) {
    // Return default config if there's an error loading
    return {
      outputMode: 'pretty',
      showBanner: true
    };
  }
}

function formatOutputPretty(data: any): string {
  if (data && typeof data === 'object') {
    if (data.status === 'ok') {
      if (data.data && typeof data.data === 'object' && data.data.stream === "completed") {
        return chalk.green('✓ Command executed successfully');
      }

      if (data.data !== null) {
        // Format the data with indentation
        return formatObjectPretty(data.data, 0);
      } else {
        return chalk.green('✓ Success');
      }
    } else if (data.status === 'error') {
      return formatErrorPretty(data);
    }
  }

  return JSON.stringify(data, null, 2);
}

function formatErrorPretty(error: any): string {
  const message = error?.message || 'An unknown error occurred';

  if (error?.errors && Array.isArray(error.errors) && error.errors.length > 0) {
    const firstError = error.errors[0];
    const errorType = firstError?.type || 'GENERAL_ERROR';
    const errorMessage = firstError?.message || message;

    return `${chalk.red('✗ Error')}: ${chalk.red(errorMessage)}\n${chalk.yellow(`Type: ${errorType}`)}`;
  }

  return `${chalk.red('✗ Error')}: ${chalk.red(message)}`;
}

function formatObjectPretty(obj: any, depth: number): string {
  if (obj === null) return 'null';
  if (obj === undefined) return 'undefined';
  if (typeof obj === 'string') return chalk.blue(`"${obj}"`);
  if (typeof obj === 'number') return chalk.yellow(obj.toString());
  if (typeof obj === 'boolean') return chalk.magenta(obj.toString());
  if (Array.isArray(obj)) {
    const indent = '  '.repeat(depth);
    const nextIndent = '  '.repeat(depth + 1);

    if (obj.length === 0) return '[]';

    const items = obj.map(item => `${nextIndent}${formatObjectPretty(item, depth + 1)}`).join(',\n');
    return `[\n${items}\n${indent}]`;
  }

  if (typeof obj === 'object') {
    const indent = '  '.repeat(depth);
    const nextIndent = '  '.repeat(depth + 1);

    const entries = Object.entries(obj);
    if (entries.length === 0) return '{}';

    const formattedEntries = entries.map(([key, value]) =>
      `${nextIndent}${chalk.green(`"${key}"`)}: ${formatObjectPretty(value, depth + 1)}`
    ).join(',\n');

    return `{\n${formattedEntries}\n${indent}}`;
  }

  return obj.toString();
}

export function formatStreamingEvent(source: string, seq: number, event: any): string {
  const config = loadConfigSync();

  if (config.outputMode === 'pretty') {
    const paddedSeq = seq.toString().padStart(3, '0');
    return `[${chalk.blue(source)}][${chalk.yellow(paddedSeq)}] ${chalk.green(event.event)}: ${event.data || ''}`;
  } else {
    return JSON.stringify({
      seq,
      timestamp: new Date().toISOString(),
      source,
      event: event.event,
      data: event.data
    });
  }
}