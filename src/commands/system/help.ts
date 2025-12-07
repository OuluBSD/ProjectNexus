import { CLI_MANIFEST, CLICommandEntry } from '../../manifest/cli-manifest';
import { CommandHandler } from '../../runtime/handler-registry';
import { ExecutionContext, CommandResult } from '../../runtime/types';

interface HelpCommandArgs {
  namespace?: string;
  command?: string;
}

export class SystemHelpHandler implements CommandHandler {
  async execute(_ctx: ExecutionContext): Promise<CommandResult> {
    const { namespace, command } = _ctx.args;

    if (namespace && command) {
      // Show detailed help for specific command
      return showDetailedCommandHelp(namespace, command);
    } else if (namespace) {
      // Show commands in the namespace
      return showNamespaceCommands(namespace);
    } else {
      // Show all namespaces
      return showAllNamespaces();
    }
  }
}

function showAllNamespaces(): CommandResult {
  // Get all unique namespaces from the manifest
  const namespaces = new Set<string>();
  CLI_MANIFEST.forEach(entry => {
    if (entry.path.length > 0) {
      const namespace = entry.path[0];
      if (namespace) {
        namespaces.add(namespace);
      }
    }
  });

  const sortedNamespaces = Array.from(namespaces).sort();

  let output = 'Available namespaces:\n';
  sortedNamespaces.forEach(ns => {
    output += `  ${ns}\n`;
  });
  output += '\nUse "nexus help <namespace>" for commands in that namespace.\n';

  return {
    status: 'ok',
    data: output,
    message: '',
    errors: []
  };
}

function showNamespaceCommands(namespace: string | undefined): CommandResult {
  if (!namespace) {
    return {
      status: 'error',
      data: null,
      message: 'Namespace is required',
      errors: [{ type: 'ValidationError', message: 'Namespace is required' }]
    };
  }

  // Find all commands in the specified namespace
  const commands = CLI_MANIFEST.filter(entry =>
    entry.path.length > 0 && entry.path[0] === namespace
  );

  if (commands.length === 0) {
    return {
      status: 'error',
      data: null,
      message: `No commands found in namespace "${namespace}"`,
      errors: [{ type: 'NotFound', message: `No commands found in namespace "${namespace}"` }]
    };
  }

  let output = `Commands in namespace "${namespace}":\n`;
  commands.forEach(command => {
    const commandPath = command.path.join(' ');
    output += `  ${commandPath} - ${command.description}\n`;
  });
  output += `\nUse "nexus help ${namespace} <command>" for detailed help.\n`;

  return {
    status: 'ok',
    data: output,
    message: '',
    errors: []
  };
}

function showDetailedCommandHelp(namespace: string | undefined, commandName: string | undefined): CommandResult {
  if (!namespace || !commandName) {
    return {
      status: 'error',
      data: null,
      message: 'Both namespace and command are required',
      errors: [
        { type: 'ValidationError', message: 'Both namespace and command are required' }
      ]
    };
  }

  // Find the specific command
  const command = CLI_MANIFEST.find(entry =>
    entry.path.length >= 2 &&
    entry.path[0] === namespace &&
    entry.path[1] === commandName
  );

  if (!command) {
    return {
      status: 'error',
      data: null,
      message: `Command "${namespace} ${commandName}" not found`,
      errors: [
        { type: 'NotFound', message: `Command "${namespace} ${commandName}" not found` }
      ]
    };
  }

  // Format detailed help
  let output = `Command: ${command.id}\n`;
  output += `Description: ${command.description}\n`;

  if (command.args.length > 0) {
    output += `\nArguments:\n`;
    command.args.forEach(arg => {
      const required = arg.required ? ' (required)' : '';
      output += `  ${arg.name}${required}\n`;
    });
  }

  if (command.flags.length > 0) {
    output += `\nFlags:\n`;
    command.flags.forEach(flag => {
      const required = flag.required ? ' (required)' : '';
      const typeInfo = flag.type ? ` (type: ${flag.type})` : '';
      const valuesInfo = flag.allowedValues ? ` (allowed values: ${flag.allowedValues.join(', ')})` : '';
      output += `  --${flag.name}${required}${typeInfo}${valuesInfo}\n`;
    });
  }

  if (command.contextRequired && command.contextRequired.length > 0) {
    output += `\nContext required: ${command.contextRequired.join(', ')}\n`;
  }

  output += `\nStreaming: ${command.streaming ? 'Yes' : 'No'}\n`;

  // Add usage examples based on command category
  const commandPath = command.path.join(' ');
  const examples = generateUsageExamples(commandPath, command);
  if (examples.length > 0) {
    output += `\nExamples:\n`;
    examples.forEach(example => {
      output += `  ${example}\n`;
    });
  }

  return {
    status: 'ok',
    data: output,
    message: '',
    errors: []
  };
}

function generateUsageExamples(commandPath: string, command: any): string[] {
  const examples: string[] = [];

  if (commandPath.includes('list')) {
    examples.push(`nexus ${commandPath}`);
  } else if (commandPath.includes('view') || commandPath.includes('get')) {
    const entityId = commandPath.includes('project') ? '<projectId>' :
                    commandPath.includes('roadmap') ? '<roadmapId>' :
                    commandPath.includes('chat') ? '<chatId>' : '<id>';
    examples.push(`nexus ${commandPath} --id ${entityId}`);
  } else if (command.streaming) {
    const entityId = commandPath.includes('process') ? '<pid>' : '<id>';
    examples.push(`nexus ${commandPath} --id ${entityId}`);
  } else if (commandPath.includes('create') || commandPath.includes('select')) {
    examples.push(`nexus ${commandPath} --id <id>`);
  } else {
    // For other commands, provide a generic example
    examples.push(`nexus ${commandPath}`);
  }

  return examples;
}

export default SystemHelpHandler;