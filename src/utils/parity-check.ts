import { execSync } from 'child_process';
import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

// Load UI map from JSON file
const loadUIMap = (): any => {
  try {
    // Construct path to ui_map.json relative to project root
    const uiMapPath = join(process.cwd(), 'ui_map.json');
    const uiMapContent = readFileSync(uiMapPath, 'utf-8');
    return JSON.parse(uiMapContent);
  } catch (error) {
    console.error('Error loading UI map:', error);
    return null;
  }
};

// Extract UI actions from UI map
const extractUIActions = (uiMap: any): string[] => {
  const actions: string[] = [];

  if (uiMap && uiMap.pages) {
    for (const page of uiMap.pages) {
      if (page.actions && Array.isArray(page.actions)) {
        for (const action of page.actions) {
          // Convert UI action ID to potential CLI command ID
          // UI actions like "create-project" might map to CLI commands like "agent.project.create"
          const normalizedActionId = normalizeUIActionToCLICommand(action.id);
          actions.push(normalizedActionId);
        }
      }
    }
  }

  return actions;
};

// Convert UI action ID to potential CLI command ID
const normalizeUIActionToCLICommand = (actionId: string): string => {
  // Convert kebab-case to namespace.command format
  // Example: "create-project" -> "agent.project.create"
  // This mapping logic might need refinement based on actual convention

  // Known mappings from UI actions to CLI commands
  const knownMappings: { [key: string]: string } = {
    'create-project': 'agent.project.create',
    'edit-project': 'agent.project.update',
    'delete-project': 'agent.project.delete',
    'create-roadmap': 'agent.roadmap.create',
    'edit-roadmap': 'agent.roadmap.update',
    'create-chat': 'agent.chat.create',
    'rename-chat': 'agent.chat.rename',
    'save-file': 'file.save',
    'send-message': 'ai.session.send',
    'create-session': 'ai.session.create',
    'switch-backend': 'ai.backend.switch',
    'interrupt-response': 'ai.session.interrupt',
    'view-server-details': 'network.element.view',
    'refresh-status': 'network.status.refresh',
    'view-process-details': 'debug.process.view',
    'refresh-data': 'debug.process.refresh',
    'change-theme': 'settings.theme.change',
    'toggle-terminal-auto': 'settings.terminal.toggle'
  };

  // If we have a known mapping, return it
  if (actionId && knownMappings[actionId]) {
    return knownMappings[actionId] as string;
  }

  // Return a default value if no mapping is found
  return (actionId?.replace(/-/g, '.') || 'unknown') as string;
};

// Check CLI vs UI parity
export const checkParity = (): { status: string; errors: number; warnings: number; missing: string[] } => {
  const uiMap = loadUIMap();
  if (!uiMap) {
    return {
      status: 'error',
      errors: 1,
      warnings: 0,
      missing: ['Could not load UI map file']
    };
  }

  const uiActions = extractUIActions(uiMap);
  // We'll need to import CLI_MANIFEST for this to work but we need to avoid circular dependencies
  // For now, we're just using the function as part of the tools
  const cliCommands = [
    // These would be imported from CLI manifest in actual implementation
    'agent.project.list',
    'agent.project.view',
    'agent.project.select',
    'agent.project.current',
    'agent.roadmap.list',
    'agent.roadmap.view',
    'agent.roadmap.select',
    'agent.chat.list',
    'agent.chat.view',
    'agent.chat.select',
    'settings.show',
    'settings.set',
    'settings.reset',
    'auth.login',
    'auth.logout',
    'auth.status',
    'network.element.list',
    'network.element.view',
    'network.status',
    'network.health.stream',
    'network.graph.stream',
    'network.element.monitor',
    'debug.process.list',
    'debug.process.view',
    'debug.process.inspect',
    'debug.process.monitor',
    'debug.process.kill',
    'debug.process.logs',
    'debug.log.tail',
    'debug.log.view',
    'debug.log.search',
    'debug.websocket.list',
    'debug.websocket.view',
    'debug.websocket.stream',
    'debug.poll.list',
    'debug.poll.view',
    'debug.poll.stream',
    'system.parity',
    'system.help',
    'system.version',
    'system.completion',
    'system.doctor'
  ];

  const missing: string[] = [];
  let errors = 0;
  let warnings = 0;

  // Check each UI action against CLI commands
  for (const uiAction of uiActions) {
    // Skip if it's a simple UI action that doesn't need a CLI equivalent
    const skipActions = ['change-theme', 'toggle-terminal-auto']; // UI-only settings
    if (skipActions.includes(uiAction.split('.').join('-'))) {
      continue;
    }

    if (!cliCommands.includes(uiAction)) {
      missing.push(uiAction);

      // Determine if this is an error (critical) or warning (optional)
      // Critical actions: create, delete, and other major functionality
      if (uiAction.includes('create') || uiAction.includes('delete') || uiAction.includes('session')) {
        errors++;
        console.log(`[ERROR] ${uiAction} is missing in CLI`);
      } else {
        warnings++;
        console.log(`[WARN] ${uiAction} is missing in CLI`);
      }
    } else {
      console.log(`[OK] ${uiAction} ↔ UI`);
    }
  }

  // Additionally check for streaming commands
  const streamingCommandsInUI = uiMap.pages
    .flatMap((page: any) => page.actions)
    .filter((action: any) =>
      action.effects &&
      action.effects.apiCalls &&
      action.effects.apiCalls.some((call: string) => call.includes('websocket') || call.includes('stream'))
    )
    .map((action: any) => normalizeUIActionToCLICommand(action.id));

  for (const cmd of streamingCommandsInUI) {
    // For simplicity in this version, we're not checking streaming property
    // since we don't have access to the full CLI_MANIFEST here
    console.log(`[INFO] ${cmd} streaming check skipped in this version`);
  }

  const status = errors > 0 ? 'error' : 'ok';

  return {
    status,
    errors,
    warnings,
    missing
  };
};

export default checkParity;