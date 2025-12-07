// src/commands/settings/option/set.ts
// Settings Option set command handler

import { CommandHandler } from '../../../runtime/handler-registry';
import { ExecutionContext, CommandResult } from '../../../runtime/types';
import { loadConfig, saveConfig, isValidConfigKey, ALLOWED_CONFIG_KEYS } from '../../../state/config-store';

export class SettingsOptionSetHandler implements CommandHandler {
  async execute(context: ExecutionContext): Promise<CommandResult> {
    try {
      const { key, value } = context.flags;

      if (!key) {
        return {
          status: 'error',
          data: null,
          message: 'Missing required flag: --key',
          errors: [{
            type: 'VALIDATION_ERROR',
            message: 'Missing required flag: --key'
          }]
        };
      }

      if (!value) {
        return {
          status: 'error',
          data: null,
          message: 'Missing required flag: --value',
          errors: [{
            type: 'VALIDATION_ERROR',
            message: 'Missing required flag: --value'
          }]
        };
      }

      if (!isValidConfigKey(key)) {
        return {
          status: 'error',
          data: null,
          message: `Unknown configuration key: ${key}. Allowed keys: ${ALLOWED_CONFIG_KEYS.join(', ')}`,
          errors: [{
            type: 'INVALID_CONFIG_KEY',
            message: `Key ${key} is not allowed. Valid keys are: ${ALLOWED_CONFIG_KEYS.join(', ')}`,
            details: { allowedKeys: ALLOWED_CONFIG_KEYS }
          }]
        };
      }

      // Load current config
      const config = await loadConfig();

      // Update the specific key with the new value
      // We need to handle type conversion properly
      if (typeof config[key] === 'boolean') {
        if (value.toLowerCase() === 'true') {
          (config as any)[key] = true;
        } else if (value.toLowerCase() === 'false') {
          (config as any)[key] = false;
        } else {
          return {
            status: 'error',
            data: null,
            message: `Invalid boolean value for ${key}: ${value}. Expected 'true' or 'false'.`,
            errors: [{
              type: 'VALIDATION_ERROR',
              message: `Invalid boolean value for ${key}: ${value}. Expected 'true' or 'false'.`
            }]
          };
        }
      } else if (typeof config[key] === 'number') {
        const numValue = Number(value);
        if (isNaN(numValue)) {
          return {
            status: 'error',
            data: null,
            message: `Invalid number value for ${key}: ${value}`,
            errors: [{
              type: 'VALIDATION_ERROR',
              message: `Invalid number value for ${key}: ${value}`
            }]
          };
        }
        (config as any)[key] = numValue;
      } else if (key === 'outputMode' || key === 'themeMode' || key === 'detailMode') {
        // Check if the value is one of the allowed values for these specific keys
        const allowedValues: Record<string, string[]> = {
          outputMode: ['json', 'pretty'],
          themeMode: ['auto', 'dark', 'light'],
          detailMode: ['minimal', 'expanded']
        };

        const allowedValuesForKey = allowedValues[key];
        if (allowedValuesForKey && !allowedValuesForKey.includes(value)) {
          return {
            status: 'error',
            data: null,
            message: `Invalid value for ${key}: ${value}. Allowed values: ${allowedValuesForKey.join(', ')}`,
            errors: [{
              type: 'VALIDATION_ERROR',
              message: `Invalid value for ${key}: ${value}. Allowed values: ${allowedValuesForKey.join(', ')}`
            }]
          };
        }
        (config as any)[key] = value;
      } else {
        // For string values, just assign directly
        (config as any)[key] = value;
      }

      // Save the updated config
      await saveConfig(config);

      return {
        status: 'ok',
        data: { config },
        message: `Configuration updated: ${key} = ${config[key as keyof typeof config]}`,
        errors: []
      };
    } catch (error: any) {
      return {
        status: 'error',
        data: null,
        message: `Failed to set configuration option: ${error.message}`,
        errors: [{
          type: 'CONFIG_SET_ERROR',
          message: error.message
        }]
      };
    }
  }
}