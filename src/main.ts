// src/main.ts
// Main entry point for the Nexus CLI

import { parseCommandLine } from './parser';
import { executeCommand } from './runtime';
import { formatOutput } from './utils/formatters';
import { registerCommandHandlers } from './commands'; // Register command handlers
import { loadConfig } from './state/config-store';
import chalk from 'chalk';

// Register handlers on startup
registerCommandHandlers();

// Define standardized exit codes
enum ExitCode {
  Success = 0,
  GenericError = 1,
  ValidationError = 2,
  MissingContext = 3,
  APIError = 4,
  StreamingInterruption = 5
}

async function main(): Promise<void> {
  try {
    // Load config to check if banner should be shown
    const config = await loadConfig();

    if (config.showBanner !== false) { // Default to showing banner if not explicitly disabled
      console.log(chalk.cyan("Nexus CLI — Empowering autonomous development flows."));
    }

    // Get command line input
    const input = process.argv.slice(2).join(' ');

    // Parse and validate the command
    const validatedCommand = parseCommandLine(input);

    // Execute the command
    const result = await executeCommand(validatedCommand);

    // Format and output the result
    const output = formatOutput(result);
    console.log(output);

    // Exit with appropriate code based on result
    if (result.status === 'ok') {
      process.exit(ExitCode.Success);
    } else {
      // Determine specific exit code based on error types
      let exitCode = ExitCode.GenericError;

      if (result.errors && result.errors.length > 0) {
        const firstError = result.errors[0];
        if (firstError) {  // This extra check helps TypeScript
          switch (firstError.type) {
            case 'VALIDATION_ERROR':
              exitCode = ExitCode.ValidationError;
              break;
            case 'MISSING_REQUIRED_CONTEXT':
              exitCode = ExitCode.MissingContext;
              break;
            case 'API_ERROR':
              exitCode = ExitCode.APIError;
              break;
            case 'STREAM_INTERRUPTED':
              exitCode = ExitCode.StreamingInterruption;
              break;
            default:
              exitCode = ExitCode.GenericError;
          }
        }
      }

      process.exit(exitCode);
    }
  } catch (error: any) {
    // Handle errors and output standard error format
    const errorOutput = formatOutput({
      status: 'error',
      data: null,
      message: error.message,
      errors: [{
        type: 'PARSE_ERROR',
        message: error.message,
        timestamp: new Date().toISOString()
      }]
    });
    console.error(errorOutput);

    // Determine appropriate exit code for parse errors
    if (error.message.includes('Missing required context')) {
      process.exit(ExitCode.MissingContext);
    } else if (error.message.includes('validation')) {
      process.exit(ExitCode.ValidationError);
    } else {
      process.exit(ExitCode.GenericError);
    }
  }
}

if (require.main === module) {
  main();
}