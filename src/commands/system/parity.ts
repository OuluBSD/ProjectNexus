// src/commands/system/parity.ts
// System parity command handler

import { CommandHandler } from '../../runtime/handler-registry';
import { ExecutionContext } from '../../runtime/types';
import { checkParity } from '../../../tools/parity-check';

export class SystemParityHandler implements CommandHandler {
  async execute(context: ExecutionContext): Promise<any> {
    try {
      // Execute the parity check
      const result = checkParity();

      // Output structured JSON summary
      const output = {
        status: result.status,
        errors: result.errors,
        warnings: result.warnings,
        missing: result.missing
      };

      // If there are errors, this is considered a failure
      if (result.errors > 0) {
        return {
          status: 'error',
          data: output,
          message: `${result.errors} parity error(s) found`
        };
      }

      return {
        status: 'ok',
        data: output,
        message: 'Parity check completed successfully'
      };
    } catch (error) {
      return {
        status: 'error',
        message: `Failed to execute parity check: ${error instanceof Error ? error.message : 'Unknown error'}`
      };
    }
  }
}