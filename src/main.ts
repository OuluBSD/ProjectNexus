// src/main.ts
// Main entry point for the Nexus CLI

import { parseCommandLine } from './parser';
import { executeCommand } from './runtime';
import { formatOutput } from './utils/formatters';

async function main(): Promise<void> {
  try {
    // Get command line input
    const input = process.argv.slice(2).join(' ');
    
    // Parse the command
    const parsedCommand = parseCommandLine(input);
    
    // Execute the command
    const result = await executeCommand(parsedCommand);
    
    // Format and output the result
    const output = formatOutput(result);
    console.log(output);
    
    // Exit with appropriate code
    process.exit(result.status === 'ok' ? 0 : 1);
  } catch (error) {
    // Handle errors and output standard error format
    const errorOutput = formatOutput({
      status: 'error',
      data: null,
      message: error.message,
      errors: [{
        type: 'RUNTIME_ERROR',
        message: error.message,
        timestamp: new Date().toISOString()
      }]
    });
    console.error(errorOutput);
    process.exit(1);
  }
}

if (require.main === module) {
  main();
}