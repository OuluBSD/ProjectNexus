import { CommandHandler } from '../../runtime/handler-registry';
import { ExecutionContext, CommandResult } from '../../runtime/types';
import { BUILD_INFO } from '../../generated/build-info';

export class SystemVersionHandler implements CommandHandler {
  async execute(_ctx: ExecutionContext): Promise<CommandResult> {
    // For now, default to 'ok' but in the future this could check against a version API
    const versionStatus = await this.determineVersionStatus();

    return {
      status: 'ok',
      data: {
        version: BUILD_INFO.version,
        commit: BUILD_INFO.gitHash,
        buildDate: BUILD_INFO.buildDate,
        platform: BUILD_INFO.platform,
        channel: this.getChannelFromVersion(BUILD_INFO.version),
        versionStatus,
        minimumBackendVersion: BUILD_INFO.minimumBackendVersion || '1.0.0',
        recommendedBackendVersion: BUILD_INFO.recommendedBackendVersion || '1.0.0'
      },
      message: '',
      errors: []
    };
  }

  private async determineVersionStatus(): Promise<'ok' | 'outdated' | 'unknown'> {
    try {
      // In the future, this could be an actual API call to check version status
      // For now, we'll return 'ok' but could implement logic to check against
      // a remote API that provides current version information
      return 'ok';
    } catch (error) {
      // If we can't determine version status, return 'unknown'
      return 'unknown';
    }
  }

  private getChannelFromVersion(version: string): string {
    if (version.includes('-dev')) return 'dev';
    if (version.includes('-rc')) return 'rc';
    if (version.includes('-beta') || version.includes('-alpha')) return 'beta';
    return 'stable';
  }
}

export default SystemVersionHandler;