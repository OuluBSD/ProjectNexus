// src/commands/settings/show/index.ts
// Handler for 'nexus settings show' command

import { loadConfig } from '../../../state/config-store';

export class SettingsShowHandler {
  async execute(flags: Record<string, any>): Promise<any> {
    try {
      const config = await loadConfig();
      
      return {
        status: 'ok',
        data: { config },
        message: 'Current configuration loaded successfully',
        errors: []
      };
    } catch (error: any) {
      // Determine if this is a config parsing error
      const errorType = error instanceof SyntaxError || error.message.includes('JSON') || error.message.includes('parse')
        ? 'CONFIG_PARSE_ERROR'
        : 'CONFIG_LOAD_ERROR';

      return {
        status: 'error',
        data: null,
        message: error.message,
        errors: [{
          type: errorType,
          message: error.message,
          timestamp: new Date().toISOString()
        }]
      };
    }
  }
}