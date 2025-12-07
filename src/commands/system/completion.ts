import { CommandHandler } from '../../runtime/handler-registry';
import { ExecutionContext, CommandResult } from '../../runtime/types';
import { generateAllCompletions } from '../../utils/shell-completion';

export class SystemCompletionHandler implements CommandHandler {
  async execute(_ctx: ExecutionContext): Promise<CommandResult> {
    const { shell } = _ctx.args;

    if (!shell) {
      return {
        status: 'error',
        data: null,
        message: 'Missing required flag: --shell',
        errors: [{ type: 'ValidationError', message: 'Missing required flag: --shell' }]
      };
    }

    try {
      const completionScript = generateAllCompletions(shell);

      return {
        status: 'ok',
        data: completionScript,
        message: '',
        errors: []
      };
    } catch (error) {
      return {
        status: 'error',
        data: null,
        message: `Failed to generate completion script for shell "${shell}": ${(error as Error).message}`,
        errors: [{ type: 'GenerationError', message: `Failed to generate completion script for shell "${shell}": ${(error as Error).message}` }]
      };
    }
  }
}

export default SystemCompletionHandler;