// src/state/config-store.ts
// Central configuration storage for the Nexus CLI

import fs from 'fs/promises';
import path from 'path';
import os from 'os';

// Define the configuration structure
export interface Config {
  apiBaseUrl: string;
  authToken: string | null;
  defaultProjectId: string | null;
  defaultAiBackend: string | null;
  outputMode: 'json' | 'pretty';
  themeMode: 'auto' | 'dark' | 'light';
  autoOpenTerminal: boolean;
  detailMode: 'minimal' | 'expanded';
  rememberLastPath: boolean;
  showBanner: boolean;
}

// Define all allowed configuration keys for validation
export const ALLOWED_CONFIG_KEYS: Array<keyof Config> = [
  'apiBaseUrl',
  'authToken',
  'defaultProjectId',
  'defaultAiBackend',
  'outputMode',
  'themeMode',
  'autoOpenTerminal',
  'detailMode',
  'rememberLastPath',
  'showBanner'
];

// Get the configuration file path
export function getConfigFilePath(): string {
  const homeDir = os.homedir();
  return path.join(homeDir, '.nexus', 'config.json');
}

// Get default configuration values
export function getDefaultConfig(): Config {
  return {
    apiBaseUrl: process.env.API_BASE_URL || 'http://localhost:3000/api',
    authToken: null,
    defaultProjectId: null,
    defaultAiBackend: 'qwen',
    outputMode: 'pretty',
    themeMode: 'auto',
    autoOpenTerminal: false,
    detailMode: 'expanded',
    rememberLastPath: true,
    showBanner: true
  };
}

// Load configuration from file, creating default if it doesn't exist
export async function loadConfig(): Promise<Config> {
  const configPath = getConfigFilePath();
  
  try {
    // Ensure the config directory exists
    const configDir = path.dirname(configPath);
    await fs.mkdir(configDir, { recursive: true });
    
    // Read the config file
    const configContent = await fs.readFile(configPath, 'utf-8');
    const configFile = JSON.parse(configContent);
    
    // Merge with defaults to ensure all keys are present
    const defaultConfig = getDefaultConfig();
    const mergedConfig = { ...defaultConfig, ...configFile };
    
    return mergedConfig;
  } catch (error: any) {
    if (error.code === 'ENOENT') {
      // File doesn't exist, return default config and save it
      const defaultConfig = getDefaultConfig();
      await saveConfig(defaultConfig);
      return defaultConfig;
    } else {
      // Other error occurred, log and return defaults
      console.error(`Error reading config file: ${error.message}`);
      return getDefaultConfig();
    }
  }
}

// Save configuration to file
export async function saveConfig(config: Config): Promise<void> {
  const configPath = getConfigFilePath();
  
  // Ensure the config directory exists
  const configDir = path.dirname(configPath);
  await fs.mkdir(configDir, { recursive: true });
  
  // Write the config to file
  await fs.writeFile(configPath, JSON.stringify(config, null, 2));
}

// Reset a specific key to its default value
export async function resetConfigKey(key: keyof Config): Promise<Config> {
  const config = await loadConfig();
  const defaultConfig = getDefaultConfig();
  
  if (key in defaultConfig) {
    (config as any)[key] = defaultConfig[key];
    await saveConfig(config);
    return config;
  } else {
    throw new Error(`Unknown configuration key: ${key}`);
  }
}

// Reset all configuration to defaults
export async function resetAllConfig(): Promise<Config> {
  const defaultConfig = getDefaultConfig();
  await saveConfig(defaultConfig);
  return defaultConfig;
}

// Validate if a config key is allowed
export function isValidConfigKey(key: string): key is keyof Config {
  return ALLOWED_CONFIG_KEYS.includes(key as keyof Config);
}