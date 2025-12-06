// src/commands/settings/index.ts
// Settings namespace module entry point

import { SettingsThemeGetHandler } from './theme/get';
import { SettingsThemeSetHandler } from './theme/set';

import { SettingsWorkspaceGetHandler } from './workspace/get';
import { SettingsWorkspaceSetHandler } from './workspace/set';

import { SettingsAuthLoginHandler } from './auth/login';
import { SettingsAuthLogoutHandler } from './auth/logout';
import { SettingsAuthStatusHandler } from './auth/status';
import { SettingsAuthTokenHandler } from './auth/token';

import { SettingsOptionGetHandler } from './option/get';
import { SettingsOptionSetHandler } from './option/set';

export const settingsCommands = {
  theme: {
    get: new SettingsThemeGetHandler(),
    set: new SettingsThemeSetHandler(),
  },
  workspace: {
    get: new SettingsWorkspaceGetHandler(),
    set: new SettingsWorkspaceSetHandler(),
  },
  auth: {
    login: new SettingsAuthLoginHandler(),
    logout: new SettingsAuthLogoutHandler(),
    status: new SettingsAuthStatusHandler(),
    token: new SettingsAuthTokenHandler(),
  },
  option: {
    get: new SettingsOptionGetHandler(),
    set: new SettingsOptionSetHandler(),
  }
};