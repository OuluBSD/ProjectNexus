import { CLI_MANIFEST } from '../manifest/cli-manifest';

export function generateBashCompletion(): string {
  let bashCompletion = `#!/bin/bash
# Bash completion script for nexus CLI
  
_nexus_completion() {
    local cur prev words cword
    _init_completion || return

    local commands=()
    local namespaces=()
    
    # Extract all namespaces and commands from the manifest
    # This is a placeholder implementation - would typically parse the actual manifest dynamically
    
    # Define available commands by parsing the manifest
    # Extract all first-level namespaces
`;

  // Extract all unique namespaces
  const namespaces = new Set<string>();
  CLI_MANIFEST.forEach(entry => {
    if (entry.path.length > 0) {
      const namespace = entry.path[0];
      if (namespace) {
        namespaces.add(namespace);
      }
    }
  });

  // Add namespaces to the bash completion
  bashCompletion += `    namespaces=(${Array.from(namespaces).join(' ')})\n\n`;
  
  bashCompletion += `    COMPREPLY=()\n`;
  bashCompletion += `    cur="$2"\n`;
  bashCompletion += `    prev="$3"\n`;
  bashCompletion += `    words=($COMP_WORDS)\n`;
  bashCompletion += `    cword=$COMP_CWORD\n\n`;
  
  bashCompletion += `    case $cword in\n`;
  bashCompletion += `        1)\n`;
  bashCompletion += `            # Complete with namespaces or top-level commands\n`;
  bashCompletion += `            COMPREPLY=($(compgen -W "\${namespaces[*]} help version completion" -- "$cur"))\n`;
  bashCompletion += `            ;;\n`;
  bashCompletion += `        2)\n`;
  bashCompletion += `            # Complete with commands within the namespace\n`;
  
  // For each namespace, add completion logic
  namespaces.forEach(ns => {
    if (typeof ns === 'string') {
      const commandsForNs = CLI_MANIFEST.filter(entry =>
        entry.path.length >= 2 && entry.path[0] === ns
      ).map(entry => entry.path.slice(1).join('.')); // Get the sub-commands

      bashCompletion += `            if [[ "$prev" == "${ns}" ]]; then\n`;
      bashCompletion += `                COMPREPLY=($(compgen -W "${commandsForNs.join(' ')}" -- "$cur"))\n`;
      bashCompletion += `            fi\n`;
    }
  });
  
  bashCompletion += `            ;;\n`;
  bashCompletion += `        *)\n`;
  bashCompletion += `            # Handle flags\n`;
  bashCompletion += `            case "$prev" in\n`;
  
  // Add flags from manifest
  for (const cmd of CLI_MANIFEST) {
    if (cmd.flags.length > 0) {
      const cmdPath = cmd.path.join('.');
      bashCompletion += `                ${cmdPath || 'unknown'})\n`;
      const flagNames = cmd.flags.map(f => `--${f.name || 'unknown'}`);
      bashCompletion += `                    COMPREPLY=($(compgen -W "${flagNames.join(' ')}" -- "$cur"))\n`;
      bashCompletion += `                    ;;\n`;
    }
  }
  
  bashCompletion += `            esac\n`;
  bashCompletion += `            ;;\n`;
  bashCompletion += `    esac\n`;
  bashCompletion += `}\n\n`;
  bashCompletion += `complete -F _nexus_completion nexus\n`;
  
  return bashCompletion;
}

export function generateZshCompletion(): string {
  let zshCompletion = `#compdef nexus
  
local -a commands
local curcontext=\$curcontext state line

# Define the command structure based on the CLI manifest
_commands=(
`;

  // Group commands by namespace for zsh completion
  const groupedCommands: { [key: string]: string[] } = {};
  for (const entry of CLI_MANIFEST) {
    if (entry && entry.path && entry.path.length >= 2) {
      const namespace = entry.path[0];
      if (namespace) {
        const command = entry.path.slice(1).join('.');
        if (!groupedCommands[namespace]) {
          groupedCommands[namespace] = [];
        }
        const description = entry.description || 'No description';
        const commandsArray = groupedCommands[namespace];
        if (commandsArray) {
          commandsArray.push(`${command}:${description}`);
        }
      }
    }
  }

  // Add command definitions to zsh completion
  for (const [namespace, commands] of Object.entries(groupedCommands)) {
    zshCompletion += `  '${namespace}'\\''s commands:{->${namespace}}'[Commands for ${namespace} namespace]' \\\\\n`;
  }
  
  zshCompletion += `  'help:Show help information' \\\\\n`;
  zshCompletion += `  'version:Show version information' \\\\\n`;
  zshCompletion += `  'completion:Generate shell completion script' \\\\\n`;
  zshCompletion += `)\n\n`;

  zshCompletion += `_arguments -C \\\n`;
  zshCompletion += `  '1: :->level1' \\\n`;
  zshCompletion += `  '*: :->etc'\n\n`;

  zshCompletion += `case $state in\n`;
  zshCompletion += `  level1)\n`;
  zshCompletion += `    _describe 'nexus commands' _commands\n`;
  zshCompletion += `  ;;\n`;
  
  // Add completions for each namespace
  for (const [namespace, commands] of Object.entries(groupedCommands)) {
    if (namespace) {
      zshCompletion += `  ${namespace})\n`;
      zshCompletion += `    local -a ${namespace}_cmds\n`;
      zshCompletion += `    ${namespace}_cmds=(\n`;
      commands.forEach(cmd => {
        zshCompletion += `      '${cmd}' \\\\\n`;
      });
      zshCompletion += `    )\n`;
      zshCompletion += `    _describe '${namespace} commands' ${namespace}_cmds\n`;
      zshCompletion += `  ;;\n`;
    }
  }
  
  zshCompletion += `esac\n`;
  
  return zshCompletion;
}

export function generateFishCompletion(): string {
  let fishCompletion = `# Fish completion script for nexus CLI\n\n`;
  
  // Add all possible command combinations
  CLI_MANIFEST.forEach(entry => {
    const cmdPath = entry.path.join(' ');
    fishCompletion += `complete -c nexus -n '__fish_use_subcommand' -a ${cmdPath} -d "${entry.description}"\n`;
  });
  
  // Add flags for each command
  CLI_MANIFEST.forEach(entry => {
    const cmdPath = entry.path.join(' ');
    entry.flags.forEach(flag => {
      fishCompletion += `complete -c nexus -n '__fish_seen_subcommand_from ${cmdPath}' -l ${flag.name} -d "Flag for ${cmdPath}"\n`;
    });
  });
  
  // Add main commands
  fishCompletion += `complete -c nexus -n '__fish_use_subcommand' -a help -d "Show help information"\n`;
  fishCompletion += `complete -c nexus -n '__fish_use_subcommand' -a version -d "Show version information"\n`;
  fishCompletion += `complete -c nexus -n '__fish_use_subcommand' -a completion -d "Generate shell completion script"\n`;
  
  return fishCompletion;
}

// Main function to generate all completion scripts
export function generateAllCompletions(shell: string): string {
  switch (shell.toLowerCase()) {
    case 'bash':
      return generateBashCompletion();
    case 'zsh':
      return generateZshCompletion();
    case 'fish':
      return generateFishCompletion();
    default:
      throw new Error(`Unsupported shell: ${shell}. Supported shells are: bash, zsh, fish`);
  }
}