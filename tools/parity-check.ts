import { CLI_MANIFEST } from '../src/manifest/cli-manifest';

// Load UI map from JSON file
const loadUIMap = (): any => {
  try {
    // In a real implementation, this would read from ui_map.json
    // For now, we'll use a dynamic import since it's a JSON file
    const fs = require('fs');
    const path = require('path');
    const uiMapPath = path.join(__dirname, '../ui_map.json');
    const uiMapContent = fs.readFileSync(uiMapPath, 'utf-8');
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
  if (knownMappings[actionId]) {
    return knownMappings[actionId];
  }

  // Otherwise, try to convert kebab-case to dot notation
  // This is a basic conversion - in practice, you'd need more sophisticated mapping
  return actionId.replace(/-/g, '.');
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
  const cliCommands = CLI_MANIFEST.map(entry => entry.id);
  
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
    const cliCmd = CLI_MANIFEST.find(entry => entry.id === cmd);
    if (cliCmd && cliCmd.streaming) {
      console.log(`[OK] ${cmd} streaming matches UI`);
    } else if (cliCmd && !cliCmd.streaming) {
      console.log(`[ERROR] ${cmd} should be streaming in CLI but is not`);
      errors++;
      missing.push(`${cmd} (streaming)`);
    }
  }

  const status = errors > 0 ? 'error' : 'ok';

  return {
    status,
    errors,
    warnings,
    missing
  };
};

// Run the parity check if this script is run directly
if (require.main === module) {
  const result = checkParity();

  // Output the result in JSON format when run directly
  console.log(JSON.stringify(result, null, 2));

  if (result.status === 'error') {
    process.exit(1);
  }
}

export default checkParity;
export { checkParity };