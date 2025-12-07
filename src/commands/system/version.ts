import { CommandHandler } from '../../runtime/handler-registry';
import { ExecutionContext, CommandResult } from '../../runtime/types';
import { BUILD_INFO } from '../../generated/build-info';

export class SystemVersionHandler implements CommandHandler {
  async execute(_ctx: ExecutionContext): Promise<CommandResult> {
    return {
      status: 'ok',
      data: {
        version: BUILD_INFO.version,
        commit: BUILD_INFO.gitHash,
        buildDate: BUILD_INFO.buildDate,
        platform: BUILD_INFO.platform
      },
      message: '',
      errors: []
    };
  }
}

export default SystemVersionHandler;