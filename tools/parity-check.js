import { CLI_MANIFEST } from '../src/manifest/cli-manifest';
const loadUIMap = () => {
    try {
        const fs = require('fs');
        const path = require('path');
        const uiMapPath = path.join(__dirname, '../ui_map.json');
        const uiMapContent = fs.readFileSync(uiMapPath, 'utf-8');
        return JSON.parse(uiMapContent);
    }
    catch (error) {
        console.error('Error loading UI map:', error);
        return null;
    }
};
const extractUIActions = (uiMap) => {
    const actions = [];
    if (uiMap && uiMap.pages) {
        for (const page of uiMap.pages) {
            if (page.actions && Array.isArray(page.actions)) {
                for (const action of page.actions) {
                    const normalizedActionId = normalizeUIActionToCLICommand(action.id);
                    actions.push(normalizedActionId);
                }
            }
        }
    }
    return actions;
};
const normalizeUIActionToCLICommand = (actionId) => {
    const knownMappings = {
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
    if (knownMappings[actionId]) {
        return knownMappings[actionId];
    }
    return actionId.replace(/-/g, '.');
};
export const checkParity = () => {
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
    const missing = [];
    let errors = 0;
    let warnings = 0;
    for (const uiAction of uiActions) {
        const skipActions = ['change-theme', 'toggle-terminal-auto'];
        if (skipActions.includes(uiAction.split('.').join('-'))) {
            continue;
        }
        if (!cliCommands.includes(uiAction)) {
            missing.push(uiAction);
            if (uiAction.includes('create') || uiAction.includes('delete') || uiAction.includes('session')) {
                errors++;
                console.log(`[ERROR] ${uiAction} is missing in CLI`);
            }
            else {
                warnings++;
                console.log(`[WARN] ${uiAction} is missing in CLI`);
            }
        }
        else {
            console.log(`[OK] ${uiAction} ↔ UI`);
        }
    }
    const streamingCommandsInUI = uiMap.pages
        .flatMap((page) => page.actions)
        .filter((action) => action.effects &&
        action.effects.apiCalls &&
        action.effects.apiCalls.some((call) => call.includes('websocket') || call.includes('stream')))
        .map((action) => normalizeUIActionToCLICommand(action.id));
    for (const cmd of streamingCommandsInUI) {
        const cliCmd = CLI_MANIFEST.find(entry => entry.id === cmd);
        if (cliCmd && cliCmd.streaming) {
            console.log(`[OK] ${cmd} streaming matches UI`);
        }
        else if (cliCmd && !cliCmd.streaming) {
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
if (require.main === module) {
    const result = checkParity();
    console.log(JSON.stringify(result, null, 2));
    if (result.status === 'error') {
        process.exit(1);
    }
}
export default checkParity;
//# sourceMappingURL=parity-check.js.map